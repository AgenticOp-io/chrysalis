<?php

function chrysalis_sql_param_is_array(array $items): array
{
    $flag = is_array($items);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
