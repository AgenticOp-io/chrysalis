<?php

function chrysalis_sql_param_json_decode(string $label): array
{
    $v = json_decode($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
