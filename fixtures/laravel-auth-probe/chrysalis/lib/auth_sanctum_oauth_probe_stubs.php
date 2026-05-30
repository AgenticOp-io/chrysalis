<?php
/**
 * Stubs for Sanctum- and OAuth2-shaped class names (ingest auth-boundary heuristics / M6A).
 * No real token server; returns constants for deterministic JSON in
 * `chrysalis_auth_sanctum_oauth_probe_show.php`.
 */
declare(strict_types=1);

namespace Laravel\Sanctum;

/** @internal committed template */
final class NewAccessToken
{
    public static function probe(): bool
    {
        return true;
    }
}

namespace League\OAuth2\Client;

/** @internal committed template */
final class GenericProvider
{
    public static function probe(): string
    {
        return "oauth-probe-ok";
    }
}
