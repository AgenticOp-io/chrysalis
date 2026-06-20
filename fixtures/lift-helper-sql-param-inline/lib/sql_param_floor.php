<?php

function chrysalis_sql_param_floor(float $amount): array
{
    $v = floor($amount);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
