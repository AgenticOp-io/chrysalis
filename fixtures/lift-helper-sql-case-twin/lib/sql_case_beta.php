<?php

function chrysalis_sql_case_beta(): array
{
    return query_all('select id from items where active = 1');
}
