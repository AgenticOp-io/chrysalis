<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Db;

use Chrysalis\Oracle\Recorder;
use PDO as BasePDO;
use PDOStatement as BasePDOStatement;

/**
 * Custom PDOStatement that emits `sql.query` on execute().
 *
 * PDO requires the statement class's constructor to be protected; instances
 * are created by PDO itself when `ATTR_STATEMENT_CLASS` is set.
 *
 * For SELECT-shaped statements we buffer the full result set on execute()
 * (and on the PDO::query path via setBufferedRows) so we can:
 *   1. Record row payloads in the trace for verify replay (Node).
 *   2. Serve fetch()/fetchAll() from the buffer without double-hitting the DB.
 */
final class Statement extends BasePDOStatement
{
    private string $sql = '';
    private string $driverName = 'pdo';

    /** @var array<int|string, mixed> */
    private array $boundValues = [];

    /** @var list<array<string, mixed>>|null */
    private ?array $bufferedRows = null;

    private int $bufferIndex = 0;

    // PDO instantiates via `[Statement::class, [$pdo]]`.
    protected function __construct(private BasePDO $pdo)
    {
    }

    public function rememberSql(string $sql, string $driverName): void
    {
        $this->sql = $sql;
        $this->driverName = $driverName;
    }

    public function bindValue(
        string|int $param,
        mixed $value,
        int $type = BasePDO::PARAM_STR
    ): bool {
        $ok = parent::bindValue($param, $value, $type);
        if ($ok) {
            $this->boundValues[$param] = $value;
        }
        return $ok;
    }

    /**
     * Used by PDO::query() after the driver executes: replace the live cursor
     * with a buffered result set and return rows for the recorder.
     *
     * @return list<array<string, mixed>>
     */
    public function adoptBufferedResultFromQuery(): array
    {
        $this->bufferedRows = null;
        $this->bufferIndex = 0;
        if ($this->columnCount() <= 0) {
            return [];
        }
        /** @var list<array<string, mixed>> $all */
        $all = $this->fetchAll(BasePDO::FETCH_ASSOC);
        $this->bufferedRows = $all;
        $this->bufferIndex = 0;
        return $all;
    }

    /**
     * @param array<int|string, mixed>|null $params
     */
    public function execute(?array $params = null): bool
    {
        $this->bufferedRows = null;
        $this->bufferIndex = 0;
        $t0 = hrtime(true);
        $ok = parent::execute($params);
        $durationUs = (int)round((hrtime(true) - $t0) / 1000);
        if (!$ok) {
            return false;
        }
        $effectiveParams = $params ?? $this->boundValues;
        $origin = Recorder::callerOutsidePrelude();
        $shape = self::inferRowShape($this);
        /** @var list<array<string, mixed>> $rowsForRecorder */
        $rowsForRecorder = [];
        if ($this->columnCount() > 0) {
            /** @var list<array<string, mixed>> $all */
            $all = $this->fetchAll(BasePDO::FETCH_ASSOC);
            $this->bufferedRows = $all;
            $this->bufferIndex = 0;
            $rowsForRecorder = $all;
        }
        Recorder::onSqlQuery(
            $this->driverName,
            $this->sql,
            array_values($effectiveParams),
            self::safeRowCount($this),
            $shape,
            $durationUs,
            $origin,
            $rowsForRecorder,
        );
        return $ok;
    }

    public function fetch(int $mode = BasePDO::FETCH_DEFAULT, mixed ...$args): mixed
    {
        if ($this->bufferedRows !== null) {
            if ($this->bufferIndex < count($this->bufferedRows)) {
                $row = $this->bufferedRows[$this->bufferIndex];
                $this->bufferIndex += 1;
                if ($mode === BasePDO::FETCH_ASSOC || $mode === BasePDO::FETCH_DEFAULT) {
                    return $row;
                }
            }
            return false;
        }
        return parent::fetch($mode, ...$args);
    }

    /**
     * @param int $mode
     * @param mixed $args
     * @return array<mixed>
     */
    public function fetchAll(int $mode = BasePDO::FETCH_DEFAULT, mixed ...$args): array
    {
        if ($this->bufferedRows !== null) {
            $rest = array_slice($this->bufferedRows, $this->bufferIndex);
            $this->bufferIndex = count($this->bufferedRows);
            return $rest;
        }
        return parent::fetchAll($mode, ...$args);
    }

    /**
     * @return array<int, array{name: string, typeTag: string}>
     */
    private static function inferRowShape(BasePDOStatement $stmt): array
    {
        $shape = [];
        $count = $stmt->columnCount();
        for ($i = 0; $i < $count; $i++) {
            $meta = @$stmt->getColumnMeta($i);
            if (!is_array($meta)) {
                continue;
            }
            $shape[] = [
                'name' => (string)($meta['name'] ?? ''),
                'typeTag' => (string)($meta['native_type'] ?? ($meta['pdo_type'] ?? 'unknown')),
            ];
        }
        return $shape;
    }

    private static function safeRowCount(BasePDOStatement $stmt): int
    {
        try {
            return $stmt->rowCount();
        } catch (\Throwable $_) {
            return 0;
        }
    }
}
