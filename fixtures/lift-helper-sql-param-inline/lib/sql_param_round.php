<?php

function chrysalis_sql_param_round(float $amount): array
{
    $v = round($amount);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
