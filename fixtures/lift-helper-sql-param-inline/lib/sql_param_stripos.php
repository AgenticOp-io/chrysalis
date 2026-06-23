<?php

function chrysalis_sql_param_stripos(string $label): array
{
    $v = stripos($label, ',');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
