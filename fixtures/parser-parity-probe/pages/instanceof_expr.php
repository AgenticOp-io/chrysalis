<?php

function is_widget(object $value): bool
{
    return $value instanceof stdClass;
}

echo is_widget(new stdClass()) ? '1' : '0';
