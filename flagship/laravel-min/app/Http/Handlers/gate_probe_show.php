<?php
/**
 * Gate facade probe: exercises `Illuminate\Support\Facades\Gate::{allows,denies}`
 * for WebIR + oracle (Milestone 6A).
 */
declare(strict_types=1);

require_once dirname(__DIR__, 3) . "/lib/gate_facade_stub.php";

header("Content-Type: text/plain; charset=utf-8");

$mode = isset($_GET["m"]) ? (string) $_GET["m"] : "allow";
if ($mode === "deny") {
    echo \Illuminate\Support\Facades\Gate::denies("chrysalis-probe-deny") ? "deny:1\n" : "deny:0\n";
} else {
    echo \Illuminate\Support\Facades\Gate::allows("chrysalis-probe-yes") ? "allow:1\n" : "allow:0\n";
}
