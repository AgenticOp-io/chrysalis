<?php

function chrysalis_sql_param_max(int $n): array
{
    $v = max($n, 0);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
