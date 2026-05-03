<?php

declare(strict_types=1);

namespace Chrysalis\Oracle;

/**
 * Applies a list of redaction rules to an event array before it is written to
 * disk. Rules are matched against fixed dotted paths derived from the event
 * type. See `packages/oracle/src/redaction.ts` for the authoritative rule
 * semantics; the two implementations must stay in lockstep with
 * `packages/oracle/src/redaction.ts` (`DEFAULT_REDACTION` rules array).
 */
final class Redactor
{
    private const MASK = '***REDACTED***';

    /** @var array<int, array{path: string, kind: string}> */
    private array $rules;

    private string $configHash;

    /**
     * @param array<int, array<string, mixed>> $rules
     */
    public function __construct(array $rules)
    {
        $normalized = [];
        foreach ($rules as $r) {
            $path = (string)($r['path'] ?? '');
            $kind = (string)($r['kind'] ?? 'mask');
            if ($path === '' || !in_array($kind, ['drop', 'hash', 'mask', 'verbatim'], true)) {
                continue;
            }
            $normalized[] = ['path' => $path, 'kind' => $kind];
        }
        $this->rules = $normalized;

        // Canonical JSON: sort keys so hash is stable across configs written in
        // different orders. Matches `canonicalJSON` in the Node redaction module.
        $canonical = [];
        foreach ($normalized as $r) {
            $canonical[] = ['kind' => $r['kind'], 'path' => $r['path']];
        }
        usort($canonical, static fn(array $a, array $b): int => strcmp($a['path'], $b['path']));
        $this->configHash = substr(hash('sha256', json_encode($canonical, JSON_UNESCAPED_SLASHES) ?: ''), 0, 16);
    }

    public function configHash(): string
    {
        return $this->configHash;
    }

    /**
     * @return array<int, array{path: string, kind: string}>
     */
    public function rules(): array
    {
        return $this->rules;
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    public function apply(array $event): array
    {
        $type = (string)($event['type'] ?? '');
        switch ($type) {
            case 'http.request':
                if (isset($event['headers']) && is_array($event['headers'])) {
                    $event['headers'] = $this->applyToMap($event['headers'], 'request.headers.');
                }
                if (isset($event['cookies']) && is_array($event['cookies'])) {
                    $event['cookies'] = $this->applyToMap($event['cookies'], 'request.cookies.');
                }
                if (isset($event['post']) && is_array($event['post'])) {
                    $event['post'] = $this->applyToMap($event['post'], 'request.post.');
                }
                if (isset($event['query']) && is_array($event['query'])) {
                    $event['query'] = $this->applyToMap($event['query'], 'request.query.');
                }
                if (isset($event['session']) && is_array($event['session'])) {
                    $event['session'] = $this->applyToMap($event['session'], 'session.');
                }
                break;
            case 'http.response':
                if (isset($event['headers']) && is_array($event['headers'])) {
                    $event['headers'] = $this->applyToMap($event['headers'], 'response.headers.');
                }
                if (isset($event['session']) && is_array($event['session'])) {
                    $event['session'] = $this->applyToMap($event['session'], 'session.');
                }
                // Special: the rule "response.body" masks the whole body.
                if ($this->findKind('response.body') !== null) {
                    $event['body'] = self::MASK;
                }
                break;
            case 'php.setcookie':
                if (isset($event['name'])) {
                    $kind = $this->findKind('setcookie.' . (string)$event['name']);
                    if ($kind !== null) {
                        $event['value'] = $this->applyKind((string)($event['value'] ?? ''), $kind);
                    }
                }
                break;
            case 'http.outbound':
                $kindUrl = $this->findKind('outbound.url');
                if ($kindUrl !== null && isset($event['url'])) {
                    $event['url'] = $this->applyKind((string)$event['url'], $kindUrl);
                }
                break;
            case 'mail.send':
                foreach (['to' => 'mail.to', 'subject' => 'mail.subject'] as $field => $rulePath) {
                    $kind = $this->findKind($rulePath);
                    if ($kind !== null && isset($event[$field])) {
                        $event[$field] = $this->applyKind((string)$event[$field], $kind);
                    }
                }
                break;
            case 'sql.query':
                if (isset($event['rows']) && is_array($event['rows'])) {
                    $event['rows'] = $this->redactSqlQueryRows($event['rows']);
                }
                if (isset($event['params']) && is_array($event['params'])) {
                    $rowShape = $event['rowShape'] ?? [];
                    // SELECT-shaped queries feed `params` into recorded-SQL tape matching (`paramsMatch` in
                    // emitted runtimes). Only mutate-shaped events (empty `rowShape`) may apply sql.params rules.
                    if (!is_array($rowShape) || count($rowShape) === 0) {
                        $driver = (string)($event['driver'] ?? '');
                        $sql = (string)($event['sql'] ?? '');
                        $event['params'] = $this->redactSqlQueryParams($driver, $sql, $event['params']);
                    }
                }
                break;
        }
        return $event;
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function redactSqlQueryRows(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                $out[] = $row;
                continue;
            }
            $new = [];
            foreach ($row as $col => $val) {
                $kind = $this->findRowFieldKind((string)$col);
                if ($kind === null) {
                    $new[(string)$col] = $val;
                    continue;
                }
                if ($kind === 'drop') {
                    continue;
                }
                $s = is_scalar($val) || $val === null ? (string)$val : (json_encode($val) ?: '');
                $new[(string)$col] = $this->applyKind($s, $kind);
            }
            $out[] = $new;
        }
        return $out;
    }

    /**
     * Rules use path `sql.params[<driver>:<sqlPrefix>].<index>` (see `packages/oracle/src/redaction.ts`).
     * Driver may be `*` (any). Prefix matches the start of trimmed SQL (case-insensitive).
     * Empty prefix is ignored (no match). `drop` on params is applied as `mask` so bind arity stays stable for tapes.
     *
     * @param list<mixed> $params
     * @return list<mixed>
     */
    private function redactSqlQueryParams(string $driver, string $sql, array $params): array
    {
        $trimSql = ltrim($sql);
        foreach ($this->rules as $r) {
            $parsed = $this->parseSqlParamsRulePath($r['path']);
            if ($parsed === null) {
                continue;
            }
            [$ruleDriver, $prefix, $index] = $parsed;
            if (!$this->sqlParamsDriverMatches($ruleDriver, $driver)) {
                continue;
            }
            if (!$this->sqlStartsWithCaseInsensitivePrefix($trimSql, $prefix)) {
                continue;
            }
            if (!array_key_exists($index, $params)) {
                continue;
            }
            $kind = $r['kind'] === 'drop' ? 'mask' : $r['kind'];
            $val = $params[$index];
            $s = is_scalar($val) || $val === null ? (string)$val : (json_encode($val) ?: '');
            $params[$index] = $this->applyKind($s, $kind);
        }

        return $params;
    }

    /**
     * @return array{0: string, 1: string, 2: int}|null tuple: driver pattern, SQL prefix, param index
     */
    private function parseSqlParamsRulePath(string $path): ?array
    {
        if (!preg_match('/^sql\.params\[([^:]+):(.+)\]\.(\d+)\z/', $path, $m)) {
            return null;
        }
        $idx = (int)$m[3];
        if ($idx < 0) {
            return null;
        }

        return [$m[1], $m[2], $idx];
    }

    private function sqlParamsDriverMatches(string $ruleDriver, string $actual): bool
    {
        if ($ruleDriver === '*' || $ruleDriver === '') {
            return true;
        }

        return strcasecmp($ruleDriver, $actual) === 0;
    }

    /**
     * Prefix must be non-empty; matches when trimmed SQL starts with prefix (byte-wise casefold ASCII-ish via strtolower).
     */
    private function sqlStartsWithCaseInsensitivePrefix(string $trimSql, string $prefix): bool
    {
        $p = ltrim($prefix);
        if ($p === '') {
            return false;
        }

        return str_starts_with(strtolower($trimSql), strtolower($p));
    }

    private function findRowFieldKind(string $column): ?string
    {
        foreach ($this->rules as $r) {
            if (!str_starts_with($r['path'], 'sql.row.')) {
                continue;
            }
            $field = substr($r['path'], 8);
            if ($field !== '' && strcasecmp($field, $column) === 0) {
                return $r['kind'];
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $map
     * @return array<string, mixed>|\stdClass
     */
    private function applyToMap(array $map, string $prefix)
    {
        $out = [];
        foreach ($map as $k => $v) {
            $kind = $this->findKind($prefix . (string)$k, true);
            if ($kind === null) {
                $out[(string)$k] = $v;
                continue;
            }
            if ($kind === 'drop') {
                continue;
            }
            $out[(string)$k] = $this->applyKind(is_scalar($v) || $v === null ? (string)$v : (json_encode($v) ?: ''), $kind);
        }
        // Preserve object-ness: an empty map must still serialize as `{}`.
        return count($out) === 0 ? new \stdClass() : $out;
    }

    private function findKind(string $fullPath, bool $caseInsensitiveTail = false): ?string
    {
        foreach ($this->rules as $r) {
            if ($r['path'] === $fullPath) {
                return $r['kind'];
            }
            if ($caseInsensitiveTail) {
                $dot = strrpos($r['path'], '.');
                $dot2 = strrpos($fullPath, '.');
                if ($dot !== false && $dot2 !== false) {
                    $ruleHead = substr($r['path'], 0, $dot);
                    $fullHead = substr($fullPath, 0, $dot2);
                    $ruleTail = substr($r['path'], $dot + 1);
                    $fullTail = substr($fullPath, $dot2 + 1);
                    if ($ruleHead === $fullHead && strcasecmp($ruleTail, $fullTail) === 0) {
                        return $r['kind'];
                    }
                }
            }
        }
        return null;
    }

    private function applyKind(string $value, string $kind): string
    {
        if ($kind === 'verbatim') {
            return $value;
        }
        if ($kind === 'mask') {
            return self::MASK;
        }
        if ($kind === 'hash') {
            return 'sha256:' . substr(hash('sha256', $value), 0, 16);
        }
        return $value;
    }
}
