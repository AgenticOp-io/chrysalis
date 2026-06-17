<?php

class Node
{
    public ?Node $next = null;

    public function depth(): int
    {
        return $this->next?->depth() ?? 0;
    }
}

$n = new Node();
echo $n->depth();
