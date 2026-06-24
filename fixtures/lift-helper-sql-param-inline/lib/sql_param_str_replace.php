<?php

function chrysalis_sql_param_str_replace(string $label): array
{
    $v = str_replace($label, 'a', 'b');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
