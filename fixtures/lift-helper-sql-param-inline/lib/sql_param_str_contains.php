<?php

function chrysalis_sql_param_str_contains(string $label): array
{
    $v = str_contains($label, ',');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
