<?php

function chrysalis_sql_param_is_object(object $obj): array
{
    $flag = is_object($obj);
    return query_all('SELECT id FROM items WHERE id = ?', [$flag]);
}
