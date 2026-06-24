<?php

function chrysalis_sql_param_str_ends_with(string $label): array
{
    $v = str_ends_with($label, 'C');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
