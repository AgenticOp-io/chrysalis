<?php

function chrysalis_sql_param_noinline(int $active): array
{
    $a = $active;
    $b = $active + 1;
    return query_all('SELECT id FROM items WHERE active = ?', [$b]);
}
