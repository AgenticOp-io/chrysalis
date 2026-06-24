<?php

function chrysalis_sql_param_bin2hex(string $label): array
{
    $v = bin2hex($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
