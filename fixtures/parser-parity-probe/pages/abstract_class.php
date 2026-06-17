<?php

abstract class Base
{
    abstract public function run(): string;

    public static function tag(): string
    {
        return 'base';
    }
}

class Worker extends Base
{
    public function run(): string
    {
        return 'ok';
    }
}

echo Worker::tag();
echo (new Worker())->run();
