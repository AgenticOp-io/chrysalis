<?php

function chrysalis_sql_param_filter_var(string $label): array
{
    $v = filter_var($label, 513);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
