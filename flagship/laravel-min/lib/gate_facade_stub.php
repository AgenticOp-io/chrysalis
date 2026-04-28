<?php
/**
 * Test double for `Illuminate\Support\Facades\Gate` (no Laravel container).
 * Used by the `GET /gate-probe` flagship route to drive `Class::method` IR
 * and auth-boundary heuristics in ingest/emit.
 */
namespace Illuminate\Support\Facades;

/** @internal fixture */
class Gate
{
    public static function allows(string $ability, mixed $arguments = null): bool
    {
        return $ability === "chrysalis-probe-yes";
    }

    public static function denies(string $ability, mixed $arguments = null): bool
    {
        return $ability === "chrysalis-probe-deny";
    }
}
