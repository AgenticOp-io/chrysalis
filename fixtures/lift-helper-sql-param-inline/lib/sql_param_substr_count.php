<?php

function chrysalis_sql_param_substr_count(string $label): array
{
    $v = substr_count($label, ',');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
