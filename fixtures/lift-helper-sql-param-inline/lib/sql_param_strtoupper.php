<?php

function chrysalis_sql_param_strtoupper(string $label): array
{
    $v = strtoupper($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
