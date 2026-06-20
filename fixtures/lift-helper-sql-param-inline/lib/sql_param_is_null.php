<?php

function chrysalis_sql_param_is_null(?string $label): array
{
    $flag = is_null($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
