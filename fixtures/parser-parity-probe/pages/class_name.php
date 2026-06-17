<?php

function tag(object $obj): string
{
    return $obj::class;
}

echo tag(new stdClass());
