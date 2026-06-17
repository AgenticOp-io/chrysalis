<?php

function chrysalis_sql_param_sideeffect(int $active): array
{
    query_one('SELECT 1 AS n', []);
    return query_all('SELECT id FROM items WHERE active = ?', [$active]);
}
