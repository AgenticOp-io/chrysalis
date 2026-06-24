<?php

function chrysalis_sql_param_preg_match(string $label): array
{
    $v = preg_match('/\d+/', $label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
