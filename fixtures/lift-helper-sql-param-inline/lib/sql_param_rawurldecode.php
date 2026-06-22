<?php

function chrysalis_sql_param_rawurldecode(string $label): array
{
    $v = rawurldecode($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
