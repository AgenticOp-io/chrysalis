<?php

function chrysalis_sql_param_float(int $active): array
{
    $flag = floatval($active);
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
