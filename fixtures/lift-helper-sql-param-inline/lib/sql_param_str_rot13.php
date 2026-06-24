<?php

function chrysalis_sql_param_str_rot13(string $label): array
{
    $v = str_rot13($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
