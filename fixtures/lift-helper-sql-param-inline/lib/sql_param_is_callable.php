<?php

function chrysalis_sql_param_is_callable(string $label): array
{
    $v = is_callable($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
