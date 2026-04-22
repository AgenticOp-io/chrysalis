<?php
$posts = query_all(
    "SELECT p.id, p.title, p.created_at, u.username AS author
       FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 50"
);
?>
<!doctype html>
<html>
<head><title>tiny-blog</title></head>
<body>
  <h1>Posts</h1>
  <ul>
    <?php foreach ($posts as $p): ?>
      <li>
        <a href="/posts/<?= (int)$p['id'] ?>"><?= htmlspecialchars($p['title']) ?></a>
        by <?= htmlspecialchars($p['author']) ?>
        on <?= htmlspecialchars($p['created_at']) ?>
      </li>
    <?php endforeach; ?>
  </ul>
</body>
</html>
