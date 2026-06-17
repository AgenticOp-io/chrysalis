<?php

function chrysalis_sql_param_local(int $active): array
{
    $a = $active;
    return query_all('SELECT id FROM items WHERE active = ?', [$a]);
}
