<?php

function chrysalis_sql_param_str_ireplace(string $label): array
{
    $v = str_ireplace($label, 'A', 'b');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
