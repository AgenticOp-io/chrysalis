<?php

function chrysalis_sql_param_is_numeric(string $label): array
{
    $flag = is_numeric($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
