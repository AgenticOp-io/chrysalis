<?php
$db = new SQLite3(":memory:");
$db->query("SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 10");
