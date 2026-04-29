<?php
$m = new mysqli("127.0.0.1", "u", "p", "db");
$m->query("SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 10");
