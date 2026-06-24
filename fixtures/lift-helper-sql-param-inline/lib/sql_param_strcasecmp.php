<?php

function chrysalis_sql_param_strcasecmp(string $label): array
{
    $v = strcasecmp($label, 'a');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
