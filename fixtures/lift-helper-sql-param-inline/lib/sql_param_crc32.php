<?php

function chrysalis_sql_param_crc32(string $label): array
{
    $v = crc32($label);
    return query_all('SELECT id FROM items WHERE active = ?', [$v]);
}
