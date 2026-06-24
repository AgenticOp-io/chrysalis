<?php

function chrysalis_sql_param_lcfirst(string $label): array
{
    $v = lcfirst($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
