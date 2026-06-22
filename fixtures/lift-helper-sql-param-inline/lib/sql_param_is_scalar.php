<?php

function chrysalis_sql_param_is_scalar(mixed $v): array
{
    $flag = is_scalar($v);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
