<?php

function chrysalis_sql_param_base64_decode(string $label): array
{
    $v = base64_decode($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
