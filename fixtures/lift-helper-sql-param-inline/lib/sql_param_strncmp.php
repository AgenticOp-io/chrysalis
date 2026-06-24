<?php

function chrysalis_sql_param_strncmp(string $label): array
{
    $v = strncmp($label, 'A', 1);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
