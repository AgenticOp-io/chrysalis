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
 */
final class MySQLiStatement extends \mysqli_stmt
{
    private string $sql = '';

    /** Nanoseconds from {@see hrtime(true)} at the start of {@see execute()}. */
    private int $execStartNs = 0;

    private bool $pendingRecord = false;

    public function __construct(MySQLi $mysql, string $query)
    {
        $this->sql = $query;
        parent::__construct($mysql, $query);
    }

    public function execute(?array $params = null): bool
    {
        // A prior SELECT-shaped execute() that never called get_result()/store_result()
        // leaves no sql.query event (same as skipping PDO consume); do not stack flags.
        $this->pendingRecord = false;

        $this->execStartNs = (int)hrtime(true);
        $this->pendingRecord = true;
        $ok = parent::execute($params);
        if (!$ok) {
            $this->pendingRecord = false;
            return false;
        }
        if ($this->field_count === 0) {
            $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
            Recorder::onSqlQuery(
                'mysqli',
                $this->sql,
                [],
                max(0, (int)$this->affected_rows),
                [],
                $durationUs,
                Recorder::callerOutsidePrelude(),
                [],
            );
            $this->pendingRecord = false;
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
            return false;
        }
        if ($res->field_count <= 0) {
            $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
            Recorder::onSqlQuery(
                'mysqli',
                $this->sql,
                [],
                max(0, (int)$this->affected_rows),
                [],
                $durationUs,
                Recorder::callerOutsidePrelude(),
                [],
            );
            $this->pendingRecord = false;
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
            [],
            count($rows),
            $shape,
            $durationUs,
            Recorder::callerOutsidePrelude(),
            $rows,
        );
        $this->pendingRecord = false;
        return $res;
    }

    public function store_result(): bool
    {
        $ok = parent::store_result();
        if (!$ok || !$this->pendingRecord) {
            return $ok;
        }
        if ($this->field_count === 0) {
            $this->pendingRecord = false;
            return $ok;
        }
        $shape = self::inferRowShapeFromStmt($this);
        $durationUs = (int)round(((int)hrtime(true) - $this->execStartNs) / 1000);
        $rowCount = (int)$this->num_rows;
        Recorder::onSqlQuery(
            'mysqli',
            $this->sql,
            [],
            $rowCount,
            $shape,
            $durationUs,
            Recorder::callerOutsidePrelude(),
            [],
        );
        $this->pendingRecord = false;
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
