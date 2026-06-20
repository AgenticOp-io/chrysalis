<?php

function chrysalis_sql_param_is_string(string $label): array
{
    $flag = is_string($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
