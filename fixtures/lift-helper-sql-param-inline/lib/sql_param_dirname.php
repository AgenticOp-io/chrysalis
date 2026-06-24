<?php

function chrysalis_sql_param_dirname(string $label): array
{
    $v = dirname($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
