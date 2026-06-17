<?php

function chrysalis_sql_param_cast(int $active): array
{
    $flag = (int) $active;
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
