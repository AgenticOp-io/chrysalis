<?php

function chrysalis_sql_param_str_starts_with(string $label): array
{
    $v = str_starts_with($label, 'A');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
