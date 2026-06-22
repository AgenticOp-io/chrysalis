<?php

function chrysalis_sql_param_urldecode(string $label): array
{
    $v = urldecode($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
