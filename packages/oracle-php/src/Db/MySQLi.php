<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Db;

use Chrysalis\Oracle\Recorder;

/**
 * Drop-in replacement for \mysqli that emits `sql.query` events for {@see query()}
 * and prepared-statement paths without changing application call sites beyond DB
 * factory wiring.
 *
 * Legacy apps can adopt similarly to PDO instrumentation:
 *
 *   $db = class_exists('\\Chrysalis\\Oracle\\Db\\MySQLi')
 *       ? new \Chrysalis\Oracle\Db\MySQLi($host, $user, $pass, $dbName)
 *       : new \mysqli($host, $user, $pass, $dbName);
 */
class MySQLi extends \mysqli
{
    public function query(string $query, int $result_mode = MYSQLI_STORE_RESULT): \mysqli_result|bool
    {
        $t0 = hrtime(true);
        $result = parent::query($query, $result_mode);
        $durationUs = (int)round((hrtime(true) - $t0) / 1000);
        if ($result === false) {
            return false;
        }

        /** @var array<int, array{name: string, typeTag: string}> $shape */
        $shape = [];
        /** @var list<array<string, mixed>> $rows */
        $rows = [];
        $rowCount = 0;
        if ($result instanceof \mysqli_result) {
            foreach ($result->fetch_fields() as $field) {
                $shape[] = [
                    'name' => (string)($field->name ?? ''),
                    'typeTag' => 'mysqli:' . (string)($field->type ?? 'unknown'),
                ];
            }
            if (
                $result_mode === MYSQLI_STORE_RESULT
                && $result->field_count > 0
            ) {
                while (($row = $result->fetch_assoc()) !== null) {
                    $rows[] = $row;
                }
                $result->data_seek(0);
                $rowCount = count($rows);
            } else {
                $rowCount = (int)$result->num_rows;
            }
        } else {
            // Non-SELECT queries return true; approximate affected row count.
            $rowCount = max(0, (int)$this->affected_rows);
        }

        Recorder::onSqlQuery(
            'mysqli',
            $query,
            [],
            $rowCount,
            $shape,
            $durationUs,
            Recorder::callerOutsidePrelude(),
            $rows,
        );
        return $result;
    }

    /**
     * @return MySQLiStatement|false
     */
    public function prepare(string $query): \mysqli_stmt|false
    {
        try {
            $stmt = new MySQLiStatement($this, $query);
        } catch (\mysqli_sql_exception) {
            return false;
        }
        if ($stmt->errno !== 0) {
            $stmt->close();
            return false;
        }
        return $stmt;
    }
}

