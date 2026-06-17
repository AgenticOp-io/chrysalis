<?php

function chrysalis_sql_param_bool(int $active): array
{
    $flag = (bool) $active;
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
