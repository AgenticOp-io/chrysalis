<?php

function chrysalis_sql_param_ucwords(string $label): array
{
    $v = ucwords($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
