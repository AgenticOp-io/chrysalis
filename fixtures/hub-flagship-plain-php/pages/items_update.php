<?php
header("Content-Type: application/json");
echo json_encode(["updated" => true, "id" => (int) $id]);
