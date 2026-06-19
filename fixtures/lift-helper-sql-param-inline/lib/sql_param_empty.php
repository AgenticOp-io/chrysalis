<?php

function chrysalis_sql_param_empty(string $label): array
{
    $isEmpty = empty($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$isEmpty]);
}
