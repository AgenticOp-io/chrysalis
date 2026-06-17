<?php

class Widget
{
    public string $label = 'widget';
}

$obj = new Widget();
$copy = clone $obj;
echo $copy->label;
