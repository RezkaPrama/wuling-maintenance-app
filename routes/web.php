<?php

use App\Http\Controllers\Admin\CheckSheet\CheckSheetTemplateController;
use App\Http\Controllers\Admin\Dashboard\DashboardController;
use App\Http\Controllers\Admin\Equipment\EquipmentController;
use App\Http\Controllers\Admin\Record\MaintenanceRecordWebController;
use App\Http\Controllers\Admin\Schedule\MaintenanceScheduleWebController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// Semua URL diarahkan ke app.blade.php
// React Router yang akan handle navigasinya
// Route::get('/{any}', function () {
//     return view('app');
// })->where('any', '.*');

Route::get('/', function () {
    return view('auth.login');
});

// Tambahkan route ini di routes/web.php
Route::get('/refresh-csrf', function () {
    return response()->json([
        'token' => csrf_token(),
        'status' => 'success'
    ]);
})->name('refresh.csrf');

Route::group(['prefix' => 'admin', 'middleware' => ['auth']], function () {

    // -----------------------------------------------------------------------------------------------------------------------
    // DASHBOARD
    // -----------------------------------------------------------------------------------------------------------------------

    //route dashboard
    // dashboard wuling
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard.index');

    // -----------------------------------------------------------------------------------------------------------------------
    // EQUIPMENT
    // -----------------------------------------------------------------------------------------------------------------------

    // web.php
    // Route::prefix('equipment')->name('admin.equipment.')->group(function () {
    //     Route::get('/',    [EquipmentController::class, 'index'])->name('index');
    //     Route::get('/{id}', [EquipmentController::class, 'show'])->name('show');
    // });

    // ── Equipment CRUD ──────────────────────────────────────────────────────
    Route::prefix('equipment')->name('admin.equipment.')->group(function () {
        Route::get('/',              [EquipmentController::class, 'index'])->name('index');
        Route::get('/create',        [EquipmentController::class, 'create'])->name('create');
        Route::post('/',             [EquipmentController::class, 'store'])->name('store');
        Route::get('/{id}',          [EquipmentController::class, 'show'])->name('show');
        Route::get('/{id}/edit',     [EquipmentController::class, 'edit'])->name('edit');
        Route::put('/{id}',          [EquipmentController::class, 'update'])->name('update');
        Route::delete('/{id}',       [EquipmentController::class, 'destroy'])->name('destroy');

        // ── QR Code download ────────────────────────────────────────────────
        // GET /admin/equipment/{id}/qr  → download QR code sebagai PNG/SVG
        Route::get('/{id}/qr',       [EquipmentController::class, 'downloadQr'])->name('qr');
    });

    // -----------------------------------------------------------------------------------------------------------------------
    // Check Sheet Template
    // -----------------------------------------------------------------------------------------------------------------------

    Route::prefix('admin/check-sheet')->name('admin.check-sheet.')->middleware(['auth'])->group(function () {

        Route::prefix('templates')->name('template.')->group(function () {
            Route::get('/',              [CheckSheetTemplateController::class, 'index'])->name('index');
            Route::get('/create',        [CheckSheetTemplateController::class, 'create'])->name('create');
            Route::post('/',             [CheckSheetTemplateController::class, 'store'])->name('store');
            Route::get('/{id}',          [CheckSheetTemplateController::class, 'show'])->name('show');
            Route::get('/{id}/edit',     [CheckSheetTemplateController::class, 'edit'])->name('edit');
            Route::put('/{id}',          [CheckSheetTemplateController::class, 'update'])->name('update');
            Route::patch('/{id}/toggle', [CheckSheetTemplateController::class, 'toggleActive'])->name('toggle');
            Route::delete('/{id}',       [CheckSheetTemplateController::class, 'destroy'])->name('destroy');
        });
    });


    // -----------------------------------------------------------------------------------------------------------------------
    // Jadwal PM
    // -----------------------------------------------------------------------------------------------------------------------

    // ── Jadwal PM ──────────────────────────────────────────────────────────
    Route::prefix('schedule')->name('admin.schedules.')->group(function () {

        Route::get('/',                    [MaintenanceScheduleWebController::class, 'index'])->name('index');
        Route::get('/create',              [MaintenanceScheduleWebController::class, 'create'])->name('create');
        Route::post('/',                   [MaintenanceScheduleWebController::class, 'store'])->name('store');
        Route::get('/{id}',                [MaintenanceScheduleWebController::class, 'show'])->name('show');
        Route::get('/{id}/edit',           [MaintenanceScheduleWebController::class, 'edit'])->name('edit');
        Route::put('/{id}',                [MaintenanceScheduleWebController::class, 'update'])->name('update');
        Route::delete('/{id}',             [MaintenanceScheduleWebController::class, 'destroy'])->name('destroy');

        // Recalculate semua status jadwal (bisa dipanggil manual atau dari scheduler)
        Route::post('/recalculate-status', [MaintenanceScheduleWebController::class, 'recalculateStatus'])->name('recalculate');
    });

    // -----------------------------------------------------------------------------------------------------------------------
    // Pelaksanaan PM (Maintenance Record)
    // -----------------------------------------------------------------------------------------------------------------------

    Route::prefix('records')->name('admin.records.')->group(function () {

        // ── List semua record ────────────────────────────────────────────
        Route::get('/',            [MaintenanceRecordWebController::class, 'index'])->name('index');

        // ── Buat record baru (dari daftar jadwal) ────────────────────────
        Route::get('/create',      [MaintenanceRecordWebController::class, 'create'])->name('create');
        Route::post('/',           [MaintenanceRecordWebController::class, 'store'])->name('store');

        // ── FIX: Route khusus QR scan — harus SEBELUM /{id} ────────────
        // URL target dari QR Code: GET /admin/records/from-qr?equipment_id=5
        // Jika diletakkan setelah /{id}, Laravel akan tangkap 'from-qr' sebagai {id}
        Route::get('/from-qr',     [MaintenanceRecordWebController::class, 'createFromQr'])->name('from-qr');

        // ── Detail record (read-only, untuk checker/validator) ───────────
        Route::get('/{id}',        [MaintenanceRecordWebController::class, 'show'])->name('show');

        // ── Halaman pengerjaan check sheet (teknisi) ─────────────────────
        Route::get('/{id}/work',   [MaintenanceRecordWebController::class, 'work'])->name('work');

        // ── Complete: teknisi submit selesai ─────────────────────────────
        Route::post('/{id}/complete',  [MaintenanceRecordWebController::class, 'complete'])->name('complete');

        // ── Validasi: checker/validator approve atau reject ───────────────
        Route::post('/{id}/validasi',  [MaintenanceRecordWebController::class, 'validasi'])->name('validasi');

        // ── AJAX: autosave satu item check sheet ─────────────────────────
        Route::put('/{recordId}/items/{itemId}', [MaintenanceRecordWebController::class, 'updateItem'])->name('items.update');

        // ── AJAX: upload foto untuk satu item ────────────────────────────
        Route::post('/{recordId}/photos/{itemId?}', [MaintenanceRecordWebController::class, 'uploadPhoto'])->name('photos.upload');

        Route::get('/{id}/export', [MaintenanceRecordWebController::class, 'export'])->name('export');
    });

    // ── Pelaksanaan PM (Maintenance Record) ────────────────────────────────
    // Route::prefix('records')->name('admin.records.')->group(function () {
    //     Route::get('/',                              [MaintenanceRecordWebController::class, 'index'])->name('index');
    //     Route::get('/create',                        [MaintenanceRecordWebController::class, 'create'])->name('create');
    //     Route::get('/from-qr',                       [MaintenanceRecordWebController::class, 'createFromQr'])->name('from-qr');
    //     Route::post('/',                             [MaintenanceRecordWebController::class, 'store'])->name('store');
    //     Route::get('/{id}',                         [MaintenanceRecordWebController::class, 'show'])->name('show');
    //     Route::get('/{id}/work',                    [MaintenanceRecordWebController::class, 'work'])->name('work');
    //     Route::put('/{recordId}/items/{itemId}',    [MaintenanceRecordWebController::class, 'updateItem'])->name('updateItem');
    //     Route::post('/{id}/complete',               [MaintenanceRecordWebController::class, 'complete'])->name('complete');
    //     Route::post('/{recordId}/upload-photo/{itemId?}', [MaintenanceRecordWebController::class, 'uploadPhoto'])->name('uploadPhoto');
    //     Route::post('/{id}/validate',               [MaintenanceRecordWebController::class, 'validate'])->name('validate');
    // });
});
