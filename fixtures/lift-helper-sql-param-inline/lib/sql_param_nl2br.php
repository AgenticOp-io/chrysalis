<?php

function chrysalis_sql_param_nl2br(string $label): array
{
    $v = nl2br($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
