<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckSheetTemplateController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\MaintenanceRecordController;
use App\Http\Controllers\Api\MaintenanceScheduleController;
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
        Route::get('/categories', [EquipmentController::class, 'categories']);
        Route::get('/{id}',       [EquipmentController::class, 'show']);
        Route::put('/{id}',       [EquipmentController::class, 'update']);
        Route::delete('/{id}',    [EquipmentController::class, 'destroy']);
        Route::get('/{id}/qr',    [EquipmentController::class, 'downloadQr']);
    });

    // TODO: check-sheet/templates, schedules, records — sama seperti sebelumnya

    // TODO: check-sheet/templates, schedules, records — sama seperti sebelumnya
    Route::prefix('check-sheet/templates')->group(function () {
        Route::get('/',              [CheckSheetTemplateController::class, 'index']);
        Route::get('/form-data',     [CheckSheetTemplateController::class, 'formData']);
        Route::post('/',             [CheckSheetTemplateController::class, 'store']);
        Route::get('/{id}',          [CheckSheetTemplateController::class, 'show']);
        Route::put('/{id}',          [CheckSheetTemplateController::class, 'update']);
        Route::patch('/{id}/toggle', [CheckSheetTemplateController::class, 'toggleActive']);
        Route::delete('/{id}',       [CheckSheetTemplateController::class, 'destroy']);
    });

    // TODO: records — sama seperti sebelumnya
    Route::prefix('schedules')->group(function () {
        Route::get('/',                    [MaintenanceScheduleController::class, 'index']);
        Route::get('/form-data',           [MaintenanceScheduleController::class, 'formData']);
        Route::post('/',                   [MaintenanceScheduleController::class, 'store']);
        Route::post('/recalculate-status', [MaintenanceScheduleController::class, 'recalculateStatus']);
        Route::get('/{id}',                [MaintenanceScheduleController::class, 'show']);
        Route::put('/{id}',                [MaintenanceScheduleController::class, 'update']);
        Route::delete('/{id}',             [MaintenanceScheduleController::class, 'destroy']);
    });

    Route::prefix('records')->group(function () {
        Route::get('/',                            [MaintenanceRecordController::class, 'index']);
        Route::get('/create-data',                 [MaintenanceRecordController::class, 'createData']);
        Route::get('/schedule/{scheduleId}/templates', [MaintenanceRecordController::class, 'templatesForSchedule']);
        Route::post('/',                           [MaintenanceRecordController::class, 'store']);
        Route::get('/{id}',                        [MaintenanceRecordController::class, 'show']);
        Route::get('/{id}/work',                   [MaintenanceRecordController::class, 'work']);
        Route::put('/{id}/items/{itemId}',         [MaintenanceRecordController::class, 'updateItem']);
        Route::post('/{id}/items/{itemId}/photo',  [MaintenanceRecordController::class, 'uploadPhoto']);
        Route::post('/{id}/complete',              [MaintenanceRecordController::class, 'complete']);
        Route::post('/{id}/validate',              [MaintenanceRecordController::class, 'validasi']);
    });
});
