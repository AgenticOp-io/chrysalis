<?php

class Counter
{
    private int $n = 0;

    public function bump(): int
    {
        $this->n++;
        return $this->n;
    }

    public static function zero(): int
    {
        return 0;
    }
}

echo Counter::zero();
