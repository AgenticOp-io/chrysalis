<?php

function chrysalis_sql_param_trim_charlist(string $label): array
{
    $v = trim($label, ' ');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
