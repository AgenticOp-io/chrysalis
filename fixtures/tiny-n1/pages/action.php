<?php
// Stringly-typed dispatch — the `$_POST['op']` controller. The insight
// recognizer flags this as an action-union candidate.

if ($_POST['op'] === 'create') {
    exec_sql("INSERT INTO widgets (name) VALUES (?)", [$_POST['name']]);
    echo "created";
} elseif ($_POST['op'] === 'update') {
    exec_sql("UPDATE widgets SET name = ? WHERE id = ?", [$_POST['name'], (int)$_POST['id']]);
    echo "updated";
} elseif ($_POST['op'] === 'delete') {
    exec_sql("DELETE FROM widgets WHERE id = ?", [(int)$_POST['id']]);
    echo "deleted";
} elseif ($_POST['op'] === 'archive') {
    exec_sql("UPDATE widgets SET archived = 1 WHERE id = ?", [(int)$_POST['id']]);
    echo "archived";
} else {
    http_response_code(400);
    echo "unknown op";
}
