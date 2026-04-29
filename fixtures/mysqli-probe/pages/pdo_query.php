<?php
$pdo = new PDO("sqlite::memory:");
$pdo->query("SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 10");
