<?php

function chrysalis_sql_param_substr(string $label): array
{
    $v = substr($label, 1);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
