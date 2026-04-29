<?php

$res = db()->query("SELECT id, name FROM widgets WHERE active = 1 ORDER BY id ASC LIMIT 10");
?>
<!doctype html>
<html>
<head><title>mysqli-probe direct query</title></head>
<body>
  <p><?= $res === false ? "0" : "1" ?></p>
</body>
</html>
