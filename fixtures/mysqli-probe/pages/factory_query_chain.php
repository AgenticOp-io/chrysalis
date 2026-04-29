<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/DbFactory.php';

DbFactory::getConnection()->query('SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 10');
