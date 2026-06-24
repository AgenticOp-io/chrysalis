<?php

function chrysalis_sql_param_gettype(string $label): array
{
    $v = gettype($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
