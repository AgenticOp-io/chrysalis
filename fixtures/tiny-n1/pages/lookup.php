<?php
// Classic dynamic-SQL anti-pattern: the query is assembled from a request
// field via a helper, with no parameter binding. Exercises the
// raw-sql-concat recognizer.

$id = $_GET['id'] ?? '0';

$rows = query_all("SELECT id, name FROM users WHERE id = " . $id);

foreach ($rows as $row) {
    echo $row['name'];
}
