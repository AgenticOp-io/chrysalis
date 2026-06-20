<?php

function chrysalis_sql_param_not(bool $active): array
{
    $flag = !$active;
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
