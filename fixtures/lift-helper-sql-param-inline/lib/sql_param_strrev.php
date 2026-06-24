<?php

function chrysalis_sql_param_strrev(string $label): array
{
    $v = strrev($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
