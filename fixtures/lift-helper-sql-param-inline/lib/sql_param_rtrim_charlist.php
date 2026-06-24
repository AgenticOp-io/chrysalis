<?php

function chrysalis_sql_param_rtrim_charlist(string $label): array
{
    $v = rtrim($label, ' ');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
