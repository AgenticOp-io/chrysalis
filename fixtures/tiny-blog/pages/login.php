<?php
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$password = isset($_POST['password']) ? (string)$_POST['password'] : '';

if ($username === '' || $password === '') {
    http_response_code(400);
    echo "Missing credentials";
    exit;
}

$user = query_one('SELECT id, password FROM users WHERE username = ?', [$username]);

if ($user === null || !verify_password($password, $user['password'])) {
    http_response_code(401);
    echo "Invalid credentials";
    exit;
}

$_SESSION['user_id'] = (int)$user['id'];
header('Location: /posts');
