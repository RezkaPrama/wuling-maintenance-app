<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EquipmentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Auth pakai Laravel Sanctum (bukan tymon/jwt-auth), konsisten dengan
| Api\AuthController yang sudah ada dan dipakai mobile app.
| Token Sanctum tetap dikirim sebagai Bearer token — cara pakainya di
| axios sama persis dengan JWT, jadi tidak ada perubahan di sisi
| axiosInstance.js.
|
*/

// ── Auth — TIDAK pakai prefix v1, sesuai route yang sudah ada ──────────
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);
});

// ── Modul-modul aplikasi — tetap di bawah prefix v1 ─────────────────────
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {

    Route::prefix('equipment')->group(function () {
        Route::get('/',           [EquipmentController::class, 'index']);
        Route::get('/form-data',  [EquipmentController::class, 'formData']);
        Route::post('/',          [EquipmentController::class, 'store']);
        Route::get('/{id}',       [EquipmentController::class, 'show']);
        Route::put('/{id}',       [EquipmentController::class, 'update']);
        Route::delete('/{id}',    [EquipmentController::class, 'destroy']);
        Route::get('/{id}/qr',    [EquipmentController::class, 'downloadQr']);
    });

    // TODO: check-sheet/templates, schedules, records — sama seperti sebelumnya
});