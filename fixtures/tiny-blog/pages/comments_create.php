<?php
// Chrysalis archaeology: inline HTML probe — <textarea name="body"></textarea>
$me = require_login();

$body = isset($_POST['body']) ? trim($_POST['body']) : '';
// RFC-0021 subject: empty(param) early-exit → opaque g_empty_body (Hono/WebIR remain authority).
if (empty($body)) {
    http_response_code(400);
    echo "Comment body required";
    exit;
}

$post = query_one("SELECT id FROM posts WHERE id = ? AND status = 'published'", [$post_id]);
// RFC-0021 subject: !param early-exit → cond_expr `!post` (row-or-null truthiness).
if (!$post) {
    http_response_code(404);
    echo "Post not found";
    exit;
}

exec_sql(
    "INSERT INTO comments (post_id, author_id, body) VALUES (?, ?, ?)",
    [$post_id, $me['id'], $body]
);

header('Location: /posts/' . $post_id);
