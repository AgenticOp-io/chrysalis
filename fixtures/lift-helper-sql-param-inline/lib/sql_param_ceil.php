<?php

function chrysalis_sql_param_ceil(float $amount): array
{
    $v = ceil($amount);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
