<?php
// Unescaped reflection of a query parameter — reflected XSS.
// Exercises the unescaped-output recognizer.

$q = $_GET['q'] ?? '';

echo "<h1>Results for " . $q . "</h1>";
echo "<p>You searched for: " . $q . "</p>";
