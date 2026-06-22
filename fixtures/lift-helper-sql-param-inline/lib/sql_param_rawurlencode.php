<?php

function chrysalis_sql_param_rawurlencode(string $label): array
{
    $v = rawurlencode($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
