<?php

function current_user(): ?array {
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    return query_one('SELECT id, username FROM users WHERE id = ?', [$_SESSION['user_id']]);
}

function require_login(): array {
    $u = current_user();
    if ($u === null) {
        http_response_code(401);
        echo "Login required";
        exit;
    }
    return $u;
}

function verify_password(string $plain, string $hash): bool {
    return password_verify($plain, $hash);
}
