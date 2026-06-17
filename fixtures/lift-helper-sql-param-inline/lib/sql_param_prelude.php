<?php

function chrysalis_sql_param_prelude(int $active): array
{
    $a = $active;
    strlen($a);
    return query_all('SELECT id FROM items WHERE active = ?', [$a]);
}
