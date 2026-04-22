<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Db;

use Chrysalis\Oracle\Recorder;
use PDO as BasePDO;
use PDOStatement as BasePDOStatement;

/**
 * Drop-in replacement for \PDO that emits `sql.query` events.
 *
 * Legacy apps adopt this by changing their DB factory to:
 *
 *   $pdo = class_exists('\\Chrysalis\\Oracle\\Db\\PDO')
 *       ? new \Chrysalis\Oracle\Db\PDO($dsn, $user, $pass)
 *       : new \PDO($dsn, $user, $pass);
 *
 * Everything else continues to work because we subclass \PDO directly.
 */
final class PDO extends BasePDO
{
    /**
     * @param string|null          $username
     * @param string|null          $password
     * @param array<int, mixed>|null $options
     */
    public function __construct(string $dsn, ?string $username = null, ?string $password = null, ?array $options = null)
    {
        parent::__construct($dsn, $username, $password, $options);
        parent::setAttribute(BasePDO::ATTR_STATEMENT_CLASS, [Statement::class, [$this]]);
    }

    public function query(string $query, ?int $fetchMode = null, ...$fetchModeArgs): BasePDOStatement|false
    {
        $t0 = hrtime(true);
        $stmt = $fetchMode === null ? parent::query($query) : parent::query($query, $fetchMode, ...$fetchModeArgs);
        $durationUs = (int)round((hrtime(true) - $t0) / 1000);
        if ($stmt === false) {
            return false;
        }
        $origin = Recorder::callerOutsidePrelude();
        $shape = self::inferRowShape($stmt);
        Recorder::onSqlQuery(
            self::driverFor($this),
            $query,
            [],
            self::safeRowCount($stmt),
            $shape,
            $durationUs,
            $origin
        );
        return $stmt;
    }

    /**
     * @param array<int, mixed>|null $options
     */
    public function prepare(string $query, array $options = []): BasePDOStatement|false
    {
        $stmt = parent::prepare($query, $options);
        if ($stmt instanceof Statement) {
            $stmt->rememberSql($query, self::driverFor($this));
        }
        return $stmt;
    }

    public function exec(string $statement): int|false
    {
        $t0 = hrtime(true);
        $result = parent::exec($statement);
        $durationUs = (int)round((hrtime(true) - $t0) / 1000);
        if ($result === false) {
            return false;
        }
        $origin = Recorder::callerOutsidePrelude();
        Recorder::onSqlQuery(
            self::driverFor($this),
            $statement,
            [],
            $result,
            [],
            $durationUs,
            $origin
        );
        return $result;
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

    public static function driverFor(BasePDO $pdo): string
    {
        $name = (string)$pdo->getAttribute(BasePDO::ATTR_DRIVER_NAME);
        if ($name === 'sqlite') return 'sqlite';
        if ($name === 'mysql') return 'mysql';
        return 'pdo';
    }
}
