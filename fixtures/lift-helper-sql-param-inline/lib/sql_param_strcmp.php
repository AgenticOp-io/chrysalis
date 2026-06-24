<?php

function chrysalis_sql_param_strcmp(string $label): array
{
    $v = strcmp($label, 'A');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
