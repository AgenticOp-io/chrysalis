<?php

function chrysalis_sql_param_stripslashes(string $label): array
{
    $v = stripslashes($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
