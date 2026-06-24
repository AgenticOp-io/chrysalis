<?php

function chrysalis_sql_param_preg_split(string $label): array
{
    $v = preg_split('/,/', $label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
