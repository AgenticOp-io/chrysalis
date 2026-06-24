<?php

function chrysalis_sql_param_ltrim_charlist(string $label): array
{
    $v = ltrim($label, ' ');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
