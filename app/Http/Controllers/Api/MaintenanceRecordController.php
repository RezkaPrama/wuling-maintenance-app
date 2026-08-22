<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MaintenanceScheduleController extends Controller
{
    // ============================================================
    // INDEX — Daftar jadwal PM + data kalender
    // ============================================================
    public function index(Request $request)
    {
        $filterStatus = $request->input('filter_status');
        $filterCycle  = $request->input('filter_cycle');
        $filterGroup  = $request->input('filter_group');
        $filterMonth  = $request->input('filter_month', now()->format('Y-m'));
        $perPage      = $request->input('per_page', 25);

        $query = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id', 'ms.equipment_id', 'ms.pm_cycle',
                'ms.interval_days', 'ms.last_maintenance',
                'ms.next_maintenance', 'ms.status',
                'e.equipment_code', 'e.equipment_name',
                'e.etm_group', 'e.machine_category', 'e.location',
                'e.status as equipment_status',
            );

        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('ms.status', $filterStatus);
        }
        if ($filterCycle && $filterCycle !== 'all') {
            $query->where('ms.pm_cycle', $filterCycle);
        }
        if ($filterGroup) {
            $query->where('e.etm_group', $filterGroup);
        }

        $query->orderByRaw("CASE ms.status
                WHEN 'overdue'   THEN 1
                WHEN 'due'       THEN 2
                WHEN 'pending'   THEN 3
                WHEN 'completed' THEN 4
                ELSE 5 END")
              ->orderBy('ms.next_maintenance', 'asc');

        $schedules = $query->paginate($perPage)->appends($request->query());

        // ── Data kalender bulan yang dipilih ──
        [$calYear, $calMonth] = explode('-', $filterMonth);
        $calendarEvents = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id', 'ms.pm_cycle', 'ms.next_maintenance', 'ms.status',
                'e.equipment_code', 'e.equipment_name', 'e.etm_group',
            )
            ->whereYear('ms.next_maintenance', $calYear)
            ->whereMonth('ms.next_maintenance', $calMonth)
            ->orderBy('ms.next_maintenance')
            ->get();

        $stats = DB::table('maintenance_schedules')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'due'       THEN 1 ELSE 0 END) as due,
                SUM(CASE WHEN status = 'overdue'   THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            ")->first();

        $scheduleThisMonth = DB::table('maintenance_schedules')
            ->whereMonth('next_maintenance', now()->month)
            ->whereYear('next_maintenance', now()->year)
            ->count();

        $etmGroups = DB::table('equipment')
            ->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')
            ->pluck('etm_group');

        return response()->json([
            'schedules' => $schedules,
            'calendar' => [
                'year'   => (int) $calYear,
                'month'  => (int) $calMonth,
                'events' => $calendarEvents,
            ],
            'stats' => $stats,
            'schedule_this_month' => $scheduleThisMonth,
            'etm_groups' => $etmGroups,
            'filters' => [
                'filter_status' => $filterStatus,
                'filter_cycle'  => $filterCycle,
                'filter_group'  => $filterGroup,
                'filter_month'  => $filterMonth,
            ],
        ]);
    }

    // ============================================================
    // FORM DATA — dropdown equipment + info jadwal existing (buat cek duplikasi)
    // ============================================================
    public function formData()
    {
        $equipmentList = DB::table('equipment')
            ->where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group', 'machine_category', 'location']);

        // Jadwal yang masih aktif (non-completed) per equipment — dipakai
        // frontend buat kasih warning "equipment ini udah punya jadwal
        // cycle X" sebelum submit, bukan cuma nunggu error dari backend.
        $existingSchedules = DB::table('maintenance_schedules')
            ->whereNotIn('status', ['completed'])
            ->get(['id', 'equipment_id', 'pm_cycle', 'status']);

        return response()->json([
            'equipment_list'     => $equipmentList,
            'existing_schedules' => $existingSchedules,
        ]);
    }

    // ============================================================
    // STORE — Simpan jadwal baru (dengan auto-hitung next_maintenance)
    // ============================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id'     => 'required|exists:equipment,id',
            'pm_cycle'         => 'required|in:1M,3M,6M,1Y',
            'last_maintenance' => 'nullable|date',
            'next_maintenance' => 'nullable|date',
        ]);

        // Salah satu WAJIB diisi: last_maintenance (buat auto-hitung) ATAU
        // next_maintenance (input manual, buat equipment yang belum pernah
        // di-maintain / data historisnya tidak diketahui).
        if (empty($validated['last_maintenance']) && empty($validated['next_maintenance'])) {
            return response()->json([
                'message' => 'Isi salah satu: Tanggal Terakhir Maintenance atau Jadwal Berikutnya.',
                'errors'  => ['last_maintenance' => ['Wajib diisi salah satu dengan Jadwal Berikutnya.']],
            ], 422);
        }

        // Cek duplikasi: 1 equipment + 1 pm_cycle yang masih aktif (non-completed)
        $duplicate = DB::table('maintenance_schedules')
            ->where('equipment_id', $validated['equipment_id'])
            ->where('pm_cycle', $validated['pm_cycle'])
            ->whereNotIn('status', ['completed'])
            ->exists();

        if ($duplicate) {
            $equipment = DB::table('equipment')->find($validated['equipment_id']);
            return response()->json([
                'message' => "Equipment [{$equipment->equipment_name}] sudah memiliki jadwal PM {$validated['pm_cycle']} yang aktif.",
                'errors'  => ['pm_cycle' => ["Equipment ini sudah punya jadwal {$validated['pm_cycle']} aktif."]],
            ], 422);
        }

        // ── Auto-hitung next_maintenance kalau last_maintenance diisi ──
        // Ini prioritas utama: last_maintenance + pm_cycle SELALU jadi
        // sumber kebenaran next_maintenance kalau last_maintenance ada,
        // supaya konsisten (bukan campur manual+otomatis yang gampang beda).
        if (!empty($validated['last_maintenance'])) {
            $nextDate = $this->calculateNextMaintenance(
                Carbon::parse($validated['last_maintenance']),
                $validated['pm_cycle']
            );
        } else {
            $nextDate = Carbon::parse($validated['next_maintenance']);
        }

        $status = $this->resolveStatus($nextDate);

        DB::table('maintenance_schedules')->insert([
            'equipment_id'     => $validated['equipment_id'],
            'pm_cycle'         => $validated['pm_cycle'],
            'interval_days'    => null, // sudah tidak dipakai buat hitung — next_maintenance dihitung langsung dari tanggal kalender (bulan/tahun), bukan estimasi jumlah hari
            'interval_hours'   => null,
            'last_maintenance' => $validated['last_maintenance'] ?? null,
            'next_maintenance' => $nextDate->format('Y-m-d'),
            'status'           => $status,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $equipment = DB::table('equipment')->find($validated['equipment_id']);

        return response()->json([
            'message' => "Jadwal PM {$validated['pm_cycle']} untuk [{$equipment->equipment_name}] berhasil ditambahkan.",
            'next_maintenance' => $nextDate->format('Y-m-d'),
        ], 201);
    }

    // ============================================================
    // SHOW — Detail jadwal + riwayat record + template yang cocok
    // ============================================================
    public function show($id)
    {
        $schedule = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.*',
                'e.equipment_code', 'e.equipment_name',
                'e.etm_group', 'e.machine_category', 'e.location',
                'e.status as equipment_status',
                'e.specifications',
            )
            ->where('ms.id', $id)
            ->first();

        if (!$schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan.'], 404);
        }

        $records = DB::table('maintenance_records as mr')
            ->join('users as tech', 'mr.technician_id', '=', 'tech.id')
            ->leftJoin('users as checker', 'mr.checker_id', '=', 'checker.id')
            ->leftJoin('check_sheet_templates as cst', 'mr.template_id', '=', 'cst.id')
            ->select(
                'mr.id', 'mr.record_number', 'mr.maintenance_date',
                'mr.start_time', 'mr.end_time', 'mr.status',
                'cst.pm_cycle', 'cst.template_name',
                'tech.name    as technician_name',
                'checker.name as checker_name',
            )
            ->where('mr.schedule_id', $id)
            ->orderBy('mr.maintenance_date', 'desc')
            ->get();

        // Template yang cocok: pm_cycle sama, DAN (equipment_id sama PERSIS
        // ATAU template default untuk machine_category equipment ini) —
        // logic yang sama dipakai nanti di Maintenance Record buat resolve
        // template otomatis.
        $templates = DB::table('check_sheet_templates')
            ->where('pm_cycle', $schedule->pm_cycle)
            ->where('is_active', 1)
            ->where(function ($q) use ($schedule) {
                $q->where('equipment_id', $schedule->equipment_id)
                  ->orWhere('default_for_etm_group', $schedule->machine_category);
            })
            ->get();

        return response()->json([
            'schedule'  => $schedule,
            'records'   => $records,
            'templates' => $templates,
        ]);
    }

    // ============================================================
    // UPDATE — Simpan perubahan jadwal (auto-hitung ulang kalau perlu)
    // ============================================================
    public function update(Request $request, $id)
    {
        $schedule = DB::table('maintenance_schedules')->where('id', $id)->first();

        if (!$schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan.'], 404);
        }

        $validated = $request->validate([
            'pm_cycle'         => 'required|in:1M,3M,6M,1Y',
            'last_maintenance' => 'nullable|date',
            'next_maintenance' => 'nullable|date',
            'status'           => 'required|in:pending,due,overdue,completed',
        ]);

        if (empty($validated['last_maintenance']) && empty($validated['next_maintenance'])) {
            return response()->json([
                'message' => 'Isi salah satu: Tanggal Terakhir Maintenance atau Jadwal Berikutnya.',
                'errors'  => ['last_maintenance' => ['Wajib diisi salah satu dengan Jadwal Berikutnya.']],
            ], 422);
        }

        // Cek duplikasi hanya kalau pm_cycle berubah
        if ($validated['pm_cycle'] !== $schedule->pm_cycle) {
            $duplicate = DB::table('maintenance_schedules')
                ->where('equipment_id', $schedule->equipment_id)
                ->where('pm_cycle', $validated['pm_cycle'])
                ->where('id', '!=', $id)
                ->whereNotIn('status', ['completed'])
                ->exists();

            if ($duplicate) {
                return response()->json([
                    'message' => "Equipment ini sudah memiliki jadwal PM {$validated['pm_cycle']} yang aktif.",
                    'errors'  => ['pm_cycle' => ['Sudah ada jadwal aktif dengan cycle ini.']],
                ], 422);
            }
        }

        // Sama seperti store() — last_maintenance selalu jadi sumber
        // kebenaran next_maintenance kalau diisi.
        if (!empty($validated['last_maintenance'])) {
            $nextDate = $this->calculateNextMaintenance(
                Carbon::parse($validated['last_maintenance']),
                $validated['pm_cycle']
            );
        } else {
            $nextDate = Carbon::parse($validated['next_maintenance']);
        }

        // Status manual "completed" dihormati apa adanya; selain itu
        // di-resolve ulang otomatis berdasarkan next_maintenance terbaru.
        $status = $validated['status'] === 'completed'
            ? 'completed'
            : $this->resolveStatus($nextDate);

        DB::table('maintenance_schedules')->where('id', $id)->update([
            'pm_cycle'         => $validated['pm_cycle'],
            'last_maintenance' => $validated['last_maintenance'] ?? null,
            'next_maintenance' => $nextDate->format('Y-m-d'),
            'status'           => $status,
            'updated_at'       => now(),
        ]);

        return response()->json([
            'message'          => 'Jadwal PM berhasil diperbarui.',
            'next_maintenance' => $nextDate->format('Y-m-d'),
        ]);
    }

    // ============================================================
    // DESTROY — Hapus jadwal (cek ada record atau tidak)
    // ============================================================
    public function destroy($id)
    {
        $schedule = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select('ms.*', 'e.equipment_name', 'e.equipment_code')
            ->where('ms.id', $id)
            ->first();

        if (!$schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan.'], 404);
        }

        $recordCount = DB::table('maintenance_records')
            ->where('schedule_id', $id)
            ->count();

        if ($recordCount > 0) {
            return response()->json([
                'message' => "Jadwal tidak dapat dihapus karena sudah memiliki {$recordCount} maintenance record.",
            ], 409);
        }

        DB::table('maintenance_schedules')->where('id', $id)->delete();

        return response()->json([
            'message' => "Jadwal PM {$schedule->pm_cycle} untuk [{$schedule->equipment_name}] berhasil dihapus.",
        ]);
    }

    // ============================================================
    // RECALCULATE STATUS — Update otomatis status semua jadwal
    // ============================================================
    public function recalculateStatus()
    {
        $schedules = DB::table('maintenance_schedules')
            ->whereNotIn('status', ['completed'])
            ->get();

        $updated = 0;
        foreach ($schedules as $s) {
            $newStatus = $this->resolveStatus(Carbon::parse($s->next_maintenance));
            if ($newStatus !== $s->status) {
                DB::table('maintenance_schedules')
                    ->where('id', $s->id)
                    ->update(['status' => $newStatus, 'updated_at' => now()]);
                $updated++;
            }
        }

        return response()->json([
            'message' => "{$updated} jadwal berhasil diperbarui statusnya.",
            'updated' => $updated,
        ]);
    }

    // ============================================================
    // PRIVATE HELPER — Hitung next_maintenance dari last_maintenance + cycle
    // Pakai penambahan bulan/tahun KALENDER (bukan estimasi jumlah hari
    // tetap seperti versi Blade lama yang pakai 180/365/730 hari), supaya
    // akurat — misal 6 bulan dari 31 Jan jadi 31 Jul, bukan +180 hari.
    // ============================================================
    private function calculateNextMaintenance(Carbon $lastDate, string $cycle): Carbon
    {
        return match ($cycle) {
            '1M' => $lastDate->copy()->addMonthNoOverflow(),
            '3M' => $lastDate->copy()->addMonthsNoOverflow(3),
            '6M' => $lastDate->copy()->addMonthsNoOverflow(6),
            '1Y' => $lastDate->copy()->addYearNoOverflow(),
        };
    }

    // ============================================================
    // PRIVATE HELPER — Tentukan status berdasarkan next_maintenance
    // ============================================================
    private function resolveStatus(Carbon $nextDate): string
    {
        $daysLeft = now()->startOfDay()->diffInDays($nextDate->copy()->startOfDay(), false);

        if ($daysLeft < 0) {
            return 'overdue';
        } elseif ($daysLeft <= 14) {
            return 'due';
        } else {
            return 'pending';
        }
    }
}