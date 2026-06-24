<?php

function chrysalis_sql_param_chunk_split(string $label): array
{
    $v = chunk_split($label, 3, '-');
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
