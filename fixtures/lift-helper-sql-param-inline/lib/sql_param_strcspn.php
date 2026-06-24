<?php

function chrysalis_sql_param_strcspn(string $label): array
{
    $v = strcspn($label, 'abc');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
