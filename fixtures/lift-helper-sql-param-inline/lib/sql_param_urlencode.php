<?php

function chrysalis_sql_param_urlencode(string $label): array
{
    $v = urlencode($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
