<?php

function chrysalis_sql_param_explode(string $label): array
{
    $v = explode(',', $label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
