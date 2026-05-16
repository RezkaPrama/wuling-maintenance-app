<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckSheetController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\MaintenanceRecordController;
use App\Http\Controllers\Api\MaintenanceScheduleController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/
// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    // Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/me', [AuthController::class, 'me']);

    // 
    Route::prefix('equipment')->group(function () {
        // Main CRUD operations
        Route::get('/equipment', [EquipmentController::class, 'index']);
        Route::get('/equipment/{id}', [EquipmentController::class, 'show']);
        Route::get('/equipment/{id}/maintenance-history', [EquipmentController::class, 'getMaintenanceHistory']);
    });

    // Maintenance Schedule Routes
    Route::prefix('maintenance-schedule')->group(function () {
        // CRM Active Bills routes
        Route::get('/maintenance-schedules', [MaintenanceScheduleController::class, 'index']);
        Route::get('/maintenance-schedules/{id}', [MaintenanceScheduleController::class, 'show']);
        Route::get('/dashboard/summary', [MaintenanceScheduleController::class, 'getDashboardSummary']);
    });

    // Check Sheet Routes
    Route::prefix('check-sheet')->group(function () {
        Route::get('/equipment/{equipmentId}/check-sheet-template', [CheckSheetController::class, 'getTemplate']);
        Route::get('/equipment/{equipmentId}/check-sheet-template/{pmCycle}', [CheckSheetController::class, 'getTemplate']);
    });

    // Maintenance Record Routes
    Route::prefix('maintenance-record')->group(function () {
        Route::get('/maintenance-records',                              [MaintenanceRecordController::class, 'index']);
        Route::post('/maintenance-records',                             [MaintenanceRecordController::class, 'store']);
        Route::get('/maintenance-records/from-qr',                     [MaintenanceRecordController::class, 'fromQr']);     // ← harus SEBELUM /{id}
        Route::get('/maintenance-records/{id}',                        [MaintenanceRecordController::class, 'show']);
        Route::put('/maintenance-records/{recordId}/items/{itemId}',   [MaintenanceRecordController::class, 'updateItem']);
        Route::post('/maintenance-records/{recordId}/photos/{itemId?}',[MaintenanceRecordController::class, 'uploadPhoto']);
        Route::post('/maintenance-records/{id}/complete',              [MaintenanceRecordController::class, 'complete']);
        Route::post('/maintenance-records/{id}/validasi',              [MaintenanceRecordController::class, 'validasi']);
    });

    // Report Routes 
    Route::prefix('report')->group(function () {
        Route::get('/reports/maintenance-summary', [ReportController::class, 'maintenanceSummary']);
        Route::get('/reports/equipment-status', [ReportController::class, 'equipmentStatus']);
        Route::get('/reports/maintenance/{recordId}', [ReportController::class, 'generateMaintenanceReport']);
    });
});