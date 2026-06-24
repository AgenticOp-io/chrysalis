<?php

function chrysalis_sql_param_strip_tags(string $label): array
{
    $v = strip_tags($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
