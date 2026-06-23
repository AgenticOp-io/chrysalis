<?php

function chrysalis_sql_param_strrpos(string $label): array
{
    $v = strrpos($label, ',');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
