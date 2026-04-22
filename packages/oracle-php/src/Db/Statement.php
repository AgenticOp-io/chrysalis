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
 */
final class Statement extends BasePDOStatement
{
    private string $sql = '';
    private string $driverName = 'pdo';

    /** @var array<int|string, mixed> */
    private array $boundValues = [];

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
     * @param array<int|string, mixed>|null $params
     */
    public function execute(?array $params = null): bool
    {
        $t0 = hrtime(true);
        $ok = parent::execute($params);
        $durationUs = (int)round((hrtime(true) - $t0) / 1000);
        if (!$ok) {
            return false;
        }
        $effectiveParams = $params ?? $this->boundValues;
        $origin = Recorder::callerOutsidePrelude();
        $shape = self::inferRowShape($this);
        Recorder::onSqlQuery(
            $this->driverName,
            $this->sql,
            array_values($effectiveParams),
            self::safeRowCount($this),
            $shape,
            $durationUs,
            $origin
        );
        return true;
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
