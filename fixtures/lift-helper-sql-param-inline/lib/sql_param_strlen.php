<?php

function chrysalis_sql_param_strlen(string $label): array
{
    $len = strlen($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$len]);
}
