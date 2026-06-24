<?php

function chrysalis_sql_param_ucfirst(string $label): array
{
    $v = ucfirst($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
