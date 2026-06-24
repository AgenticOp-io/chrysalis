<?php

function chrysalis_sql_param_hexdec(string $label): array
{
    $v = hexdec($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
