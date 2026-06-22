<?php

function chrysalis_sql_param_is_float(float $x): array
{
    $flag = is_float($x);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
