<?php

function chrysalis_sql_param_sha1(string $label): array
{
    $v = sha1($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
