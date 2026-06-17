<?php

function chrysalis_sql_param(int $active): array
{
    return query_all('SELECT id FROM items WHERE active = ?', [$active]);
}
