<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AddEquipmentUnit extends Command
{
    protected $signature = 'equipment:add-unit
                            {prefix : Prefix kode, misal "BD-BDC-FRB" (tanpa angka & tanpa akhiran /NN)}
                            {--name= : Override equipment_name untuk unit baru (default: ikut nama grup)}
                            {--dry-run : Tampilkan preview perubahan tanpa benar-benar menyimpan ke database}';

    protected $description = 'Tambah 1 unit equipment baru ke grup bernomor (misal FRB 50 -> 51) dan otomatis renumber seluruh kode dalam grup tsb';

    public function handle(): int
    {
        $prefix = rtrim($this->argument('prefix'), '-');
        $isDryRun = (bool) $this->option('dry-run');

        // Ambil semua baris yang kode-nya cocok pola "{prefix}-NN/MM"
        $rows = DB::table('equipment')
            ->where('equipment_code', 'LIKE', "{$prefix}-%/%")
            ->get();

        if ($rows->isEmpty()) {
            $this->error("Tidak ditemukan equipment dengan prefix kode \"{$prefix}\".");
            $this->line('Cek lagi penulisan prefix-nya (harus persis, termasuk garis miring "/" pada segmen line kalau ada, misal "BD-UB/A-PSW").');
            return self::FAILURE;
        }

        // Parse nomor urut & total dari tiap baris, sambil validasi semua konsisten satu grup
        $parsed = [];
        foreach ($rows as $row) {
            if (!preg_match('/^' . preg_quote($prefix, '/') . '-(\d+)\/(\d+)$/', $row->equipment_code, $m)) {
                $this->warn("Skip \"{$row->equipment_code}\" — tidak cocok pola NN/MM, mungkin equipment lain yang kebetulan prefix-nya sama.");
                continue;
            }
            $parsed[] = [
                'id' => $row->id,
                'old_code' => $row->equipment_code,
                'unit_no' => (int) $m[1],
                'equipment_name' => $row->equipment_name,
                'pm_number' => $row->pm_number,
                'location' => $row->location,
                'status' => $row->status,
                'etm_group' => $row->etm_group,
            ];
        }

        if (empty($parsed)) {
            $this->error('Tidak ada baris valid yang cocok pola penomoran NN/MM.');
            return self::FAILURE;
        }

        usort($parsed, fn ($a, $b) => $a['unit_no'] <=> $b['unit_no']);

        $currentTotal = count($parsed);
        $newTotal = $currentTotal + 1;
        $width = max(2, strlen((string) $newTotal)); // minimal 2 digit, ikut lebar existing kalau lebih panjang

        // Nama & pm_number unit baru: default ikut unit pertama di grup, bisa di-override --name
        $referenceName = $this->option('name') ?? $parsed[0]['equipment_name'];
        $referencePm = $parsed[0]['pm_number'];
        $referenceLocation = $parsed[0]['location'];
        $referenceEtmGroup = $parsed[0]['etm_group'];
        $referenceStatus = 'active';

        $this->info("Prefix          : {$prefix}");
        $this->info("Unit sekarang   : {$currentTotal}");
        $this->info("Unit setelah    : {$newTotal}");
        $this->line('');
        $this->line('Rencana perubahan kode (existing akan di-rename, denominator ikut total baru):');

        $preview = [];
        foreach ($parsed as $p) {
            $newCode = "{$prefix}-" . str_pad((string) $p['unit_no'], $width, '0', STR_PAD_LEFT) . "/{$newTotal}";
            $preview[] = [$p['old_code'], $newCode, $p['old_code'] === $newCode ? '' : '<- berubah'];
        }
        $newUnitCode = "{$prefix}-" . str_pad((string) $newTotal, $width, '0', STR_PAD_LEFT) . "/{$newTotal}";
        $preview[] = ['(baru)', $newUnitCode, '<- unit baru'];

        $this->table(['Kode Lama', 'Kode Baru', 'Ket'], $preview);

        if ($isDryRun) {
            $this->line('');
            $this->comment('--dry-run aktif: TIDAK ada perubahan yang disimpan. Jalankan tanpa --dry-run untuk eksekusi.');
            return self::SUCCESS;
        }

        if (!$this->confirm("Lanjutkan menyimpan {$newTotal} baris ke database?", false)) {
            $this->comment('Dibatalkan.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($parsed, $prefix, $newTotal, $width, $referenceName, $referencePm, $referenceLocation, $referenceEtmGroup, $referenceStatus, $newUnitCode) {
            foreach ($parsed as $p) {
                $newCode = "{$prefix}-" . str_pad((string) $p['unit_no'], $width, '0', STR_PAD_LEFT) . "/{$newTotal}";
                if ($newCode !== $p['old_code']) {
                    DB::table('equipment')->where('id', $p['id'])->update([
                        'equipment_code' => $newCode,
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('equipment')->insert([
                'equipment_code' => $newUnitCode,
                'equipment_name' => $referenceName,
                'pm_number' => $referencePm,
                'tis_number' => null,
                'etm_group' => $referenceEtmGroup,
                'location' => $referenceLocation,
                'status' => $referenceStatus,
                'specifications' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $this->info("Selesai. Unit baru \"{$newUnitCode}\" ditambahkan, {$currentTotal} kode lama di-renumber ke total {$newTotal}.");

        return self::SUCCESS;
    }
}
