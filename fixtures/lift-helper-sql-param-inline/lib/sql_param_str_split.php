<?php

function chrysalis_sql_param_str_split(string $label): array
{
    $v = str_split($label, 2);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
