<?php
header("Content-Type: application/json");
http_response_code(201);
echo json_encode(["id" => 1]);
