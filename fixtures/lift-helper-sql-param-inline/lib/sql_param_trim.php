<?php

function chrysalis_sql_param_trim(string $active): array
{
    $flag = trim($active);
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
