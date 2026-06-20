<?php

function chrysalis_sql_param_count(array $items): array
{
    $n = count($items);
    return query_all('SELECT id FROM items WHERE id = ?', [$n]);
}
