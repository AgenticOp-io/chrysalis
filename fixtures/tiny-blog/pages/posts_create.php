<?php
// Chrysalis archaeology: inline HTML probe (form-field extraction) — <input name="title"/><textarea name="body"></textarea>
$me = require_login();

$title = isset($_POST['title']) ? trim($_POST['title']) : '';
$body  = isset($_POST['body'])  ? trim($_POST['body'])  : '';

if ($title === '' || $body === '') {
    http_response_code(400);
    echo "Title and body required";
    exit;
}

$id = exec_sql(
    "INSERT INTO posts (author_id, title, body) VALUES (?, ?, ?)",
    [$me['id'], $title, $body]
);

header('Location: /posts/' . $id);
