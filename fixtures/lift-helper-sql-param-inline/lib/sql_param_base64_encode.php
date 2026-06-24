<?php

function chrysalis_sql_param_base64_encode(string $label): array
{
    $v = base64_encode($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
