<?php

function chrysalis_sql_param_round2(float $amount): array
{
    $v = round($amount, 2);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
