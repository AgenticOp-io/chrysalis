<?php

use Illuminate\Support\Facades\Route;

Route::get('/login', fn () => view('login'));
Route::get('/portal/login', fn () => view('portal.login'));
