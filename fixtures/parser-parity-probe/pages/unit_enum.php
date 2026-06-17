<?php

enum Suit
{
    case Hearts;
    case Spades;
}

function suit_name(Suit $s): string
{
    return $s->name;
}

echo suit_name(Suit::Hearts);
