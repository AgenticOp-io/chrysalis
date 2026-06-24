<?php

function chrysalis_sql_param_htmlentities(string $label): array
{
    $v = htmlentities($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
