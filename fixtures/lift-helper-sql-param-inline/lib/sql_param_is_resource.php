<?php

function chrysalis_sql_param_is_resource(string $label): array
{
    $v = is_resource($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
