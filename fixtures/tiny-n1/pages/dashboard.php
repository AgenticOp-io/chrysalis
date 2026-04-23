<?php
// A dashboard that loads posts and then issues one query per post for the
// author and another for the comment count. A classic N+1 (well, 2N+1)
// pattern — deliberately left here to exercise the insight recognizer.

$posts = query_all("SELECT id, author_id, title, created_at FROM posts ORDER BY created_at DESC LIMIT 50");
?>
<!doctype html><html><body>
<h1>Dashboard</h1>
<ul>
<?php foreach ($posts as $p): ?>
    <?php
    $author = query_one("SELECT username FROM users WHERE id = ?", [(int)$p['author_id']]);
    $comments = query_one("SELECT COUNT(*) AS c FROM comments WHERE post_id = ?", [(int)$p['id']]);
    ?>
    <li>
        <strong><?= htmlspecialchars($p['title']) ?></strong>
        by <?= htmlspecialchars($author['username']) ?>
        (<?= (int)$comments['c'] ?> comments)
    </li>
<?php endforeach; ?>
</ul>
</body></html>
