<?php

function chrysalis_sql_param_chr(int $code): array
{
    $v = chr($code);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
