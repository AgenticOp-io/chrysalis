<?php

function chrysalis_sql_param_preg_quote(string $label): array
{
    $v = preg_quote($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
