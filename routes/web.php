<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Semua DATA lewat routes/api.php (guard Sanctum). Di sini cuma ada:
| - Halaman login
| - Placeholder named-route yang dipakai sidebar/topbar Metronic
|   (route('admin.equipment.index'), dll) supaya route() helper tidak error
| - Shell React (catch-all)
|
*/

Route::get('/', function () {
    return view('auth.login');
});

Route::get('/refresh-csrf', function () {
    return response()->json([
        'token' => csrf_token(),
        'status' => 'success',
    ]);
})->name('refresh.csrf');

// ── Placeholder named-route untuk sidebar & topbar Metronic ────────────
// Semua link ini dulunya nunjuk ke controller Blade masing-masing modul.
// Sekarang cukup arahkan ke shell React yang sama — React Router yang
// nanti baca URL dan render halaman yang sesuai.
// PENTING: taruh SEMUA ini SEBELUM catch-all '/admin/{any}' di bawah.
Route::name('admin.')->group(function () {
    Route::get('/admin/dashboard',              fn () => view('app'))->name('dashboard.index');
    Route::get('/admin/equipment',               fn () => view('app'))->name('equipment.index');
    Route::get('/admin/check-sheet/templates',   fn () => view('app'))->name('check-sheet.template.index');
    Route::get('/admin/schedules',                fn () => view('app'))->name('schedules.index');
    Route::get('/admin/records',                  fn () => view('app'))->name('records.index');
    Route::get('/admin/records/create',           fn () => view('app'))->name('records.create');
    Route::get('/admin/user',                     fn () => view('app'))->name('user.index');
    Route::get('/admin/role',                     fn () => view('app'))->name('role.index');
    Route::get('/admin/permission',               fn () => view('app'))->name('permission.index');
});

// ── Shell React (catch-all) ──────────────────────────────────────────────
// Tanpa middleware 'auth' session — proteksi akses halaman dihandle React
// (RequireAuth cek token Sanctum di localStorage), proteksi DATA dihandle
// oleh guard 'auth:sanctum' di routes/api.php.
//
// Route-route bernama di atas otomatis "keserap" ke sini kalau memang
// path-nya beda dari yang didaftarkan manual; tidak masalah didaftarkan
// dua kali (nama beda, tujuan sama), Laravel akan pakai definisi pertama
// yang match untuk URL yang diketik langsung.
Route::get('/admin/{any?}', function () {
    return view('app');
})->where('any', '.*');