<?php

function chrysalis_sql_param_str_word_count(string $label): array
{
    $v = str_word_count($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
