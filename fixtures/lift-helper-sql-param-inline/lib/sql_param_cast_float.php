<?php

function chrysalis_sql_param_cast_float(int $active): array
{
    $flag = (float) $active;
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
