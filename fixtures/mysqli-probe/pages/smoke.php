<?php

$row = query_one(
    "SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 1",
);
?>
<!doctype html>
<html>
<head><title>mysqli-probe</title></head>
<body>
  <p><?= htmlspecialchars($row['name']) ?></p>
</body>
</html>
