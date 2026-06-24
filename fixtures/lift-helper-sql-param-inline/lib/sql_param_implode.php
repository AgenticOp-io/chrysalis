<?php

function chrysalis_sql_param_implode(array $arr): array
{
    $v = implode(',', $arr);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
