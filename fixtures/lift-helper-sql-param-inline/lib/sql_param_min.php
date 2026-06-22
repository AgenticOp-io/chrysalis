<?php

function chrysalis_sql_param_min(int $n): array
{
    $v = min($n, 10);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
