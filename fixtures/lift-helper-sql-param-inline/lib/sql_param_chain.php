<?php

function chrysalis_sql_param_chain(int $active): array
{
    $a = $active;
    $b = $a;
    return query_all('SELECT id FROM items WHERE active = ?', [$b]);
}
