<?php

function chrysalis_sql_param_preg_replace(string $label): array
{
    $v = preg_replace('/a/', 'b', $label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
