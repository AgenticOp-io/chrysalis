<?php

function chrysalis_sql_param_htmlspecialchars(string $label): array
{
    $v = htmlspecialchars($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
