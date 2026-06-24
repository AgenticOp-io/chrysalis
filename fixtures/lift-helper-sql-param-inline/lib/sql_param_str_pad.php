<?php

function chrysalis_sql_param_str_pad(string $label): array
{
    $v = str_pad($label, 5, '0');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
