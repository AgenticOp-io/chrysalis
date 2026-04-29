<?php
// SQLite3 extension — not tracked like PDO / mysqli / db().
$db = new SQLite3(":memory:");
$db->query("SELECT 1");
