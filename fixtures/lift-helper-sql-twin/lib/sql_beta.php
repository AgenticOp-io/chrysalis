<?php

function chrysalis_sql_beta(): array
{
    return query_all('SELECT id FROM items WHERE active = 0');
}
