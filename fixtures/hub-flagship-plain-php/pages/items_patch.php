<?php
header("Content-Type: application/json");
echo json_encode(["patched" => true, "id" => (int) $id]);
