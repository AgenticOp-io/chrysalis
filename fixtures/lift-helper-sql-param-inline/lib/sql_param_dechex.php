<?php

function chrysalis_sql_param_dechex(int $active): array
{
    $v = dechex($active);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
