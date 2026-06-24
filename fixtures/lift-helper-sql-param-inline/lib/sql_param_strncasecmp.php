<?php

function chrysalis_sql_param_strncasecmp(string $label): array
{
    $v = strncasecmp($label, 'A', 1);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
