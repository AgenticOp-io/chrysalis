<?php

function chrysalis_sql_param_number_format2(string $label): array
{
    $v = number_format($label, 2);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
