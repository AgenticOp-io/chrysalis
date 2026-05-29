<?php
http_response_code(201);
header("Content-Type: application/json");
echo json_encode(["created" => true]);
