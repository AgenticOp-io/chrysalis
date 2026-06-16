<?php

function chrysalis_sql_ws_alpha(): array
{
    return query_all('SELECT  id  FROM items WHERE active = 1');
}
