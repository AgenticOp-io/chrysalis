<?php

function chrysalis_sql_param_neg(int $n): array
{
    $v = -$n;
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
