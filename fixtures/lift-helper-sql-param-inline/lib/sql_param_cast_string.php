<?php

function chrysalis_sql_param_cast_string(int $active): array
{
    $flag = (string) $active;
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
