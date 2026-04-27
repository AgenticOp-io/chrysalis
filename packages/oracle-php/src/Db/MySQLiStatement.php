<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Db;

use Chrysalis\Oracle\Recorder;

/**
 * Instrumented {@see mysqli_stmt} returned from {@see MySQLi::prepare()}.
 *
 * Emits `sql.query` after buffered reads:
 * - non-result statements are recorded on {@see execute()}
 * - SELECT-style statements are recorded on the first {@see get_result()} or
 *   {@see store_result()} call (whichever happens first), including row
 *   payloads when {@see get_result()} is used with mysqlnd.
 * Parameter values are taken from {@see execute()}'s optional array argument when
 * present, otherwise from a snapshot of variables last wired via {@see bind_param()}
 * (same provenance model as PDO). `call_user_func_array('bind_param', ...)` bypasses
 * this wrapper and yields empty `params` in the trace.
 */
final class MySQLiStatement extends \mysqli_stmt
{
    private string $sql = '';

    /** Nanoseconds from {@see hrtime(true)} at the start of {@see execute()}. */
    private int $execStartNs = 0;

    private bool $pendingRecord = false;

    /**
     * References to variables last passed to {@see bind_param()} (input slots), so
     * we can snapshot values at {@see execute()} time for the trace.
     *
     * @var list<mixed>|null
     */
    private ?array $boundInputRefs = null;

    /**
     * Parameter values for the current round-trip when recording is deferred until
     * {@see get_result()} / {@see store_result()}.
     *
     * @var list<mixed>|null
     */
    private ?array $pendingParams = null;

    public function __construct(MySQLi $mysql, string $query)
    {
        $this->sql = $query;
        parent::__construct($mysql, $query);
    }

    public function bind_param(string $types, mixed &...$vars): bool
    {
        $ok = parent::bind_param($types, ...$vars);
        if (!$ok) {
            return false;
        }
        $this->boundInputRefs = [];
        foreach ($vars as $i => &$val) {
            $this->boundInputRefs[$i] = &$val;
        }
        unset($val);
        return true;
    }

    /**
     * @return list<mixed>
     */
    private function paramsForRecorder(?array $executeParams): array
    {
        if ($executeParams !== null) {
            return array_values($executeParams);
        }
        if ($this->boundInputRefs === null) {
            return [];
        }
        $out = [];
        foreach ($this->boundInputRefs as &$slot) {
            $out[] = $slot;
        }
        unset($slot);
        return $out;
    }

    public function execute(?array $params = null): bool
    {
        // A prior SELECT-shaped execute() that never called get_result()/store_result()
        // leaves no sql.query event (same as skipping PDO consume); do not stack flags.
        $this->pendingRecord = false;
        $this->pendingParams = null;

        $this->execStartNs = (int)hrtime(true);
        $this->pendingRecord = true;
        $ok = parent::execute($params);
        if (!$ok) {
            $this->pendingRecord = false;
            return false;
        }
        $recParams = $this->paramsForRecorder($params);
        if ($this->field_count === 0) {
            $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
            Recorder::onSqlQuery(
                'mysqli',
                $this->sql,
                $recParams,
                max(0, (int)$this->affected_rows),
                [],
                $durationUs,
                Recorder::callerOutsidePrelude(),
                [],
            );
            $this->pendingRecord = false;
        } else {
            $this->pendingParams = $recParams;
        }
        return true;
    }

    public function get_result(): \mysqli_result|false
    {
        $res = parent::get_result();
        if (!$this->pendingRecord) {
            return $res;
        }
        if ($res === false) {
            $this->pendingRecord = false;
            $this->pendingParams = null;
            return false;
        }
        if ($res->field_count <= 0) {
            $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
            Recorder::onSqlQuery(
                'mysqli',
                $this->sql,
                $this->pendingParams ?? [],
                max(0, (int)$this->affected_rows),
                [],
                $durationUs,
                Recorder::callerOutsidePrelude(),
                [],
            );
            $this->pendingRecord = false;
            $this->pendingParams = null;
            return $res;
        }
        $shape = self::inferRowShapeFromResult($res);
        /** @var list<array<string, mixed>> $rows */
        $rows = [];
        while (($row = $res->fetch_assoc()) !== null) {
            $rows[] = $row;
        }
        $res->data_seek(0);
        $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
        Recorder::onSqlQuery(
            'mysqli',
            $this->sql,
            $this->pendingParams ?? [],
            count($rows),
            $shape,
            $durationUs,
            Recorder::callerOutsidePrelude(),
            $rows,
        );
        $this->pendingRecord = false;
        $this->pendingParams = null;
        return $res;
    }

    public function store_result(): bool
    {
        $ok = parent::store_result();
        if (!$ok) {
            if ($this->pendingRecord) {
                $this->pendingRecord = false;
                $this->pendingParams = null;
            }
            return false;
        }
        if (!$this->pendingRecord) {
            return $ok;
        }
        if ($this->field_count === 0) {
            $this->pendingRecord = false;
            $this->pendingParams = null;
            return $ok;
        }
        $shape = self::inferRowShapeFromStmt($this);
        $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
        $rowCount = (int)$this->num_rows;
        Recorder::onSqlQuery(
            'mysqli',
            $this->sql,
            $this->pendingParams ?? [],
            $rowCount,
            $shape,
            $durationUs,
            Recorder::callerOutsidePrelude(),
            [],
        );
        $this->pendingRecord = false;
        $this->pendingParams = null;
        return $ok;
    }

    /**
     * @return array<int, array{name: string, typeTag: string}>
     */
    private static function inferRowShapeFromResult(\mysqli_result $res): array
    {
        $shape = [];
        foreach ($res->fetch_fields() as $field) {
            $shape[] = [
                'name' => (string)($field->name ?? ''),
                'typeTag' => 'mysqli:' . (string)($field->type ?? 'unknown'),
            ];
        }
        return $shape;
    }

    /**
     * @return array<int, array{name: string, typeTag: string}>
     */
    private static function inferRowShapeFromStmt(\mysqli_stmt $stmt): array
    {
        $meta = $stmt->result_metadata();
        if ($meta === false) {
            return [];
        }
        try {
            return self::inferRowShapeFromResult($meta);
        } finally {
            $meta->free();
        }
    }
}
