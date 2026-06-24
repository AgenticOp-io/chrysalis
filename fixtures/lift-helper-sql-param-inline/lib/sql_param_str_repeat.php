<?php

function chrysalis_sql_param_str_repeat(string $label): array
{
    $v = str_repeat($label, 3);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
