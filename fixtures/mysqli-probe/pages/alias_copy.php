<?php
$a = db();
$b = $a;
$b->query("SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 10");
