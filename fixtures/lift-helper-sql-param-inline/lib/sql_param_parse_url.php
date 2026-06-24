<?php

function chrysalis_sql_param_parse_url(string $label): array
{
    $v = parse_url($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
