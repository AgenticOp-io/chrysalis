<?php

header('Content-Type: application/json; charset=utf-8');
echo json_encode(chrysalis_sql_param_ltrim_charlist('  x'));
