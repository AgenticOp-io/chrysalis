<?php

function chrysalis_sql_param_ord(int $code): array
{
    $v = ord($code);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
