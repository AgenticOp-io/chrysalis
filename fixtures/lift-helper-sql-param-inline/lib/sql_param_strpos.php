<?php

function chrysalis_sql_param_strpos(string $label): array
{
    $v = strpos($label, ',');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
