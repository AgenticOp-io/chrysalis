<?php

function chrysalis_sql_param_json_encode(string $label): array
{
    $v = json_encode($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
