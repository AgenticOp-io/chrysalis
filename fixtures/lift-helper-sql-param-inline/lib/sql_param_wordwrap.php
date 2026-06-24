<?php

function chrysalis_sql_param_wordwrap(string $label): array
{
    $v = wordwrap($label, 5, "\n");
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
