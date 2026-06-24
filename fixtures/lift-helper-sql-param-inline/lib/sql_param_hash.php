<?php

function chrysalis_sql_param_hash(string $label): array
{
    $v = hash('sha256', $label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
