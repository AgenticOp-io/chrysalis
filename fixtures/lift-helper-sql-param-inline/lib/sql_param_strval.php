<?php

function chrysalis_sql_param_strval(int $active): array
{
    $flag = strval($active);
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
