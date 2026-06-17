<?php

function chrysalis_sql_param_literal(int $active): array
{
    $flag = 1;
    return query_all('SELECT id FROM items WHERE active = ?', [$flag]);
}
