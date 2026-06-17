<?php

function chrysalis_sql_param_coalesce(int $active): array
{
    $flag = $active ?? 1;
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
