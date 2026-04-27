<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Db;

use Chrysalis\Oracle\Recorder;

/**
 * Drop-in replacement for \mysqli that emits `sql.query` events for query()
 * calls without changing application call sites beyond DB factory wiring.
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

        $shape = [];
        $rowCount = 0;
        if ($result instanceof \mysqli_result) {
            $rowCount = (int)$result->num_rows;
            foreach ($result->fetch_fields() as $field) {
                $shape[] = [
                    'name' => (string)($field->name ?? ''),
                    'typeTag' => 'mysqli:' . (string)($field->type ?? 'unknown'),
                ];
            }
        } else {
            // Non-SELECT queries return true; approximate affected row count.
            $rowCount = max(0, (int)$this->affected_rows);
        }

        Recorder::onSqlQuery(
            'mysql',
            $query,
            [],
            $rowCount,
            $shape,
            $durationUs,
            Recorder::callerOutsidePrelude(),
            [],
        );
        return $result;
    }
}

