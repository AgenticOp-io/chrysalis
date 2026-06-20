<?php

function chrysalis_sql_param_is_int(int $n): array
{
    $flag = is_int($n);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
