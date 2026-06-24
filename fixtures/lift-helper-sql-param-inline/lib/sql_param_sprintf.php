<?php

function chrysalis_sql_param_sprintf(string $label): array
{
    $v = sprintf('%s', $label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
