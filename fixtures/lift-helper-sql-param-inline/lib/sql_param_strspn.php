<?php

function chrysalis_sql_param_strspn(string $label): array
{
    $v = strspn($label, 'abc');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
