<?php

function chrysalis_sql_param_basename(string $label): array
{
    $v = basename($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
