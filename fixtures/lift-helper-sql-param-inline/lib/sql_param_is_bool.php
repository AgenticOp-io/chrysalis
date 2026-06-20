<?php

function chrysalis_sql_param_is_bool(bool $active): array
{
    $flag = is_bool($active);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
