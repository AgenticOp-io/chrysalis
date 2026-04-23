<?php
// Every legacy shop has this handler. Six guards across three fields;
// exercises the scattered-validation recognizer.

if (!isset($_POST['username']) || empty($_POST['username'])) {
    http_response_code(400);
    echo "Missing username";
    exit;
}
if (strlen($_POST['username']) < 3) {
    http_response_code(400);
    echo "Username too short";
    exit;
}
$username = trim($_POST['username']);

if (!isset($_POST['email']) || !preg_match('/^.+@.+$/', $_POST['email'])) {
    http_response_code(400);
    echo "Bad email";
    exit;
}
$email = trim($_POST['email']);

if (empty($_POST['password']) || strlen($_POST['password']) < 8) {
    http_response_code(400);
    echo "Weak password";
    exit;
}

exec_sql("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [$username, $email, $_POST['password']]);
echo "ok";
