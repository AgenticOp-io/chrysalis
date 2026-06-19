<?php

function chrysalis_sql_param_isset(string $label): array
{
    $set = isset($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$set]);
}
