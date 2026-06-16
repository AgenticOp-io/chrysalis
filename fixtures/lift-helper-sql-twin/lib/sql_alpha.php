<?php

function chrysalis_sql_alpha(): array
{
    return query_all('SELECT id FROM items WHERE active = 1');
}
