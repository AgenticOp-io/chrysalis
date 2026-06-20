<?php

function chrysalis_sql_param_abs(int $n): array
{
    $v = abs($n);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
