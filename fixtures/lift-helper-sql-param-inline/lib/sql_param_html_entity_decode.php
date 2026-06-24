<?php

function chrysalis_sql_param_html_entity_decode(string $label): array
{
    $v = html_entity_decode($label);
    return query_all('SELECT id FROM items WHERE id = ?', [$v]);
}
