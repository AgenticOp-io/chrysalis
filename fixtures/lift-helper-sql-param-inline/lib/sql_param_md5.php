<?php

function chrysalis_sql_param_md5(string $label): array
{
    $v = md5($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
