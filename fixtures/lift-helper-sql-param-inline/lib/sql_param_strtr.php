<?php

function chrysalis_sql_param_strtr(string $label): array
{
    $v = strtr($label, 'ab', '12');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
