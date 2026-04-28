<?php
/**
 * Stubs for Socialite- and Fortify-shaped class names (Milestone 6A oracle / D192).
 * No vendor packages; deterministic strings for `chrysalis-socialite-fortify-probe`.
 */
declare(strict_types=1);

namespace Laravel\Socialite\Facades;

/** @internal committed template */
final class Socialite
{
    public static function probe(): string
    {
        return "socialite-probe-ok";
    }
}

namespace Laravel\Fortify;

/** @internal committed template */
final class Fortify
{
    public static function probe(): string
    {
        return "fortify-probe-ok";
    }
}
