<?php

enum Status: string
{
    case Ok = 'ok';
    case Missing = 'missing';
}

function label(Status $s): string
{
    return $s->value;
}

echo label(Status::Ok);
