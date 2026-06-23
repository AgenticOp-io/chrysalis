<?php

function chrysalis_sql_param_strripos(string $label): array
{
    $v = strripos($label, ',');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
