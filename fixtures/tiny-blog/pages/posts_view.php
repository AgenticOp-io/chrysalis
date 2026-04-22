<?php
$post = query_one(
    "SELECT p.id, p.title, p.body, p.created_at, u.username AS author
       FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.id = ? AND p.status = 'published'",
    [$post_id]
);

if ($post === null) {
    http_response_code(404);
    echo "Post not found";
    return;
}

$comments = query_all(
    "SELECT c.id, c.body, c.created_at, u.username AS author
       FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC",
    [$post_id]
);
?>
<!doctype html>
<html>
<head><title><?= htmlspecialchars($post['title']) ?></title></head>
<body>
  <h1><?= htmlspecialchars($post['title']) ?></h1>
  <p><em>by <?= htmlspecialchars($post['author']) ?> on <?= htmlspecialchars($post['created_at']) ?></em></p>
  <div><?= nl2br(htmlspecialchars($post['body'])) ?></div>

  <h2>Comments</h2>
  <?php if (empty($comments)): ?>
    <p>No comments yet.</p>
  <?php else: ?>
    <ul>
      <?php foreach ($comments as $c): ?>
        <li>
          <strong><?= htmlspecialchars($c['author']) ?></strong>
          (<?= htmlspecialchars($c['created_at']) ?>):
          <?= htmlspecialchars($c['body']) ?>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>

  <?php if (current_user() !== null): ?>
    <form method="post" action="/posts/<?= (int)$post['id'] ?>/comments">
      <textarea name="body" required></textarea>
      <button type="submit">Comment</button>
    </form>
  <?php else: ?>
    <p><a href="/login">Log in</a> to comment.</p>
  <?php endif; ?>
</body>
</html>
