<?php

function chrysalis_sql_param_addslashes(string $label): array
{
    $v = addslashes($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
