<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Export PM Record ke Excel — format identik template 1__FRB.xlsx
 *
 * Kolom A–Q (1–17) persis seperti template:
 *   A  = No.
 *   B  = Sub Equipment
 *   C  = Check Item
 *   D:E = Maintenance Standard (merged)
 *   F  = Check      │
 *   G  = Lubricate  │ PM Type
 *   H  = Cleaning   │
 *   I  = Tighten    │
 *   J  = Measure    │
 *   K  = Replace    │
 *   L  = Man Power  │ Work Time (plan)
 *   M  = Time (min) │
 *   N  = Hasil / Status + Nilai Ukur  ← tanggal PM (date column)
 *   O  = Man Power Aktual
 *   P  = Time Aktual (menit)
 *   Q  = Keterangan / Remarks
 */
class MaintenanceRecordExport
{
    private int $recordId;

    // Kolom (1-based)
    private const CN  = 1;   // A  No.
    private const CS  = 2;   // B  Sub Equipment
    private const CI  = 3;   // C  Check Item
    private const CD  = 4;   // D  Maintenance Standard (start merge)
    private const CE  = 5;   // E  Maintenance Standard (end merge)
    private const CF  = 6;   // F  Check
    private const CG  = 7;   // G  Lubricate
    private const CH  = 8;   // H  Cleaning
    private const CJ2 = 9;   // I  Tighten
    private const CJ  = 10;  // J  Measure
    private const CK  = 11;  // K  Replace
    private const CL  = 12;  // L  Man Power plan
    private const CM  = 13;  // M  Time plan
    private const CNR = 14;  // N  Hasil / Nilai Ukur
    private const CO  = 15;  // O  Man Power Aktual
    private const CP  = 16;  // P  Time Aktual
    private const CQ  = 17;  // Q  Keterangan

    // Font template
    private const F_HDR  = ['name' => 'Calibri',          'size' => 12];
    private const F_TITLE = ['name' => 'Calibri',          'size' => 18];
    private const F_DATA  = ['name' => 'Times New Roman',  'size' => 18];

    public function __construct(int $recordId)
    {
        $this->recordId = $recordId;
    }

    // ════════════════════════════════════════════════════════════════════
    public function download(): StreamedResponse
    {
        $spreadsheet = $this->build();
        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $this->filename(), [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    // ════════════════════════════════════════════════════════════════════
    private function build(): Spreadsheet
    {
        $record = $this->fetchRecord();
        $items  = $this->fetchItems();

        $sp = new Spreadsheet();
        $sp->getProperties()->setCreator('WULING Maintenance')->setTitle($record->record_number);
        $sp->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);

        $ws = $sp->getActiveSheet();
        $ws->setTitle('Check Sheet ' . $record->pm_cycle);

        $this->setWidths($ws);
        $this->buildHeaderInfo($ws, $record);
        $this->buildColHeaders($ws, $record);
        $last = $this->buildData($ws, $items);
        $this->buildFooter($ws, $record, $last + 1);

        $ws->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A3)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->setShowGridlines(false);
        $ws->freezePane('A7');

        return $sp;
    }

    // ════════════════════════════════════════════════════════════════════
    // COLUMN WIDTHS (dari template)
    // ════════════════════════════════════════════════════════════════════
    private function setWidths(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws): void
    {
        $widths = [
            self::CN  => 8.57,
            self::CS  => 20.57,
            self::CI  => 40.57,
            self::CD  => 40.57,
            self::CE  => 25.57,
            self::CF  => 8.5,
            self::CG  => 8.5,
            self::CH  => 8.5,
            self::CJ2 => 8.5,
            self::CJ  => 8.5,
            self::CK  => 8.5,
            self::CL  => 9.57,
            self::CM  => 9.57,
            self::CNR => 13.14,
            self::CO  => 13.14,
            self::CP  => 13.14,
            self::CQ  => 13.14,
        ];
        foreach ($widths as $col => $w) {
            $ws->getColumnDimensionByColumn($col)->setWidth($w);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // ROWS 1–4: INFO HEADER
    // ════════════════════════════════════════════════════════════════════
    private function buildHeaderInfo(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, object $r): void
    {
        $c = fn(int $n) => Coordinate::stringFromColumnIndex($n);

        // Row heights
        $ws->getRowDimension(1)->setRowHeight(41.25);
        $ws->getRowDimension(2)->setRowHeight(33.75);
        $ws->getRowDimension(3)->setRowHeight(27);
        $ws->getRowDimension(4)->setRowHeight(27);

        // ── Row 1 ────────────────────────────────────────────────────────
        // A1:N1 merged — title
        $ws->mergeCells('A1:' . $c(14) . '1');
        $ws->setCellValue('A1', 'Preventive Maintenance Check Sheet');
        $ws->getStyle('A1:' . $c(14) . '1')->applyFromArray([
            'font'      => array_merge(self::F_TITLE, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => [
                'top'    => ['borderStyle' => Border::BORDER_MEDIUM],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                'left'   => ['borderStyle' => Border::BORDER_MEDIUM],
            ],
        ]);

        // O1:Q1 merged — Doc No
        $ws->mergeCells($c(15) . '1:' . $c(17) . '1');
        $ws->setCellValue($c(15) . '1', 'Doc No : ' . ($r->doc_number ?? 'Form 05.85-05(0/A)'));
        $ws->getStyle($c(15) . '1:' . $c(17) . '1')->applyFromArray([
            'font'      => array_merge(self::F_HDR, ['bold' => true, 'size' => 10]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => [
                'top'    => ['borderStyle' => Border::BORDER_MEDIUM],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                'right'  => ['borderStyle' => Border::BORDER_MEDIUM],
            ],
        ]);

        // ── Row 2 ────────────────────────────────────────────────────────
        $this->infoBlock($ws, 2, [
            ['label' => 'Equipment :',  'lc1' => 1,  'lc2' => 2,  'val' => $r->equipment_name, 'vc1' => 3, 'vc2' => 5,  'valign' => 'center'],
            ['label' => 'PM Number :', 'lc1' => 6,  'lc2' => 9,  'val' => $r->record_number,  'vc1' => 10,'vc2' => 13, 'valign' => 'left'],
            ['label' => 'Equ. No :',   'lc1' => 14, 'lc2' => 14, 'val' => $r->equipment_code, 'vc1' => 15,'vc2' => 17, 'valign' => 'center', 'vright' => Border::BORDER_MEDIUM],
        ]);

        // ── Row 3 ────────────────────────────────────────────────────────
        $this->infoBlock($ws, 3, [
            ['label' => 'ETM Group :', 'lc1' => 1,  'lc2' => 2,  'val' => $r->etm_group,  'vc1' => 3,  'vc2' => 5,  'valign' => 'center'],
            ['label' => 'TIS Number :','lc1' => 6,  'lc2' => 9,  'val' => ($r->tis_number ?? '—'), 'vc1' => 10, 'vc2' => 13, 'valign' => 'left'],
            ['label' => 'Year',        'lc1' => 14, 'lc2' => 14, 'val' => (int)date('Y', strtotime($r->maintenance_date)), 'vc1' => 15, 'vc2' => 15, 'valign' => 'center'],
        ]);
        // PM Status label & value
        $ws->setCellValue($c(16) . '3', 'PM Status');
        $ws->getStyle($c(16) . '3')->applyFromArray([
            'font'      => array_merge(self::F_HDR, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN], 'right' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $ws->setCellValue($c(17) . '3', strtoupper($r->status));
        $ws->getStyle($c(17) . '3')->applyFromArray([
            'font'      => array_merge(self::F_HDR, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN], 'right' => ['borderStyle' => Border::BORDER_MEDIUM]],
        ]);

        // ── Row 4 ────────────────────────────────────────────────────────
        $this->infoBlock($ws, 4, [
            ['label' => 'PM Cycle',      'lc1' => 1,  'lc2' => 2,  'val' => $r->pm_cycle,         'vc1' => 3,  'vc2' => 5,  'valign' => 'center'],
            ['label' => 'Prepared by :', 'lc1' => 6,  'lc2' => 11, 'val' => $r->technician_name,  'vc1' => 12, 'vc2' => 13, 'valign' => 'center'],
        ]);
        // Checked by — label N4:O4 merged
        $ws->mergeCells($c(14) . '4:' . $c(15) . '4');
        $ws->setCellValue($c(14) . '4', 'Checked by :');
        $ws->getStyle($c(14) . '4:' . $c(15) . '4')->applyFromArray([
            'font'      => array_merge(self::F_HDR, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['top' => ['borderStyle' => Border::BORDER_THIN], 'bottom' => ['borderStyle' => Border::BORDER_MEDIUM], 'right' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        // Checker name P4:Q4
        $ws->mergeCells($c(16) . '4:' . $c(17) . '4');
        $ws->setCellValue($c(16) . '4', $r->checker_name ?? '');
        $ws->getStyle($c(16) . '4:' . $c(17) . '4')->applyFromArray([
            'font'      => array_merge(self::F_HDR, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['top' => ['borderStyle' => Border::BORDER_THIN], 'bottom' => ['borderStyle' => Border::BORDER_MEDIUM], 'right' => ['borderStyle' => Border::BORDER_MEDIUM]],
        ]);
    }

    // ════════════════════════════════════════════════════════════════════
    // ROWS 5–6: COLUMN HEADERS
    // ════════════════════════════════════════════════════════════════════
    private function buildColHeaders(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, object $r): void
    {
        $c = fn(int $n) => Coordinate::stringFromColumnIndex($n);
        $ws->getRowDimension(5)->setRowHeight(30);
        $ws->getRowDimension(6)->setRowHeight(75);

        $setHdr = function (string $range, string $val, bool $topMedium = false) use ($ws) {
            [$start] = explode(':', $range . ':');
            $ws->setCellValue($start, $val);
            $style = [
                'font'      => array_merge(self::F_HDR, ['bold' => true]),
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ];
            if ($topMedium) $style['borders']['top'] = ['borderStyle' => Border::BORDER_MEDIUM];
            $ws->getStyle($range)->applyFromArray($style);
        };

        // ── Row 5 spans ─────────────────────────────────────────────────
        $ws->mergeCells('A5:A6');       $setHdr('A5:A6', 'No.', true);
        $ws->mergeCells('B5:B6');       $setHdr('B5:B6', 'Sub Equipment', true);
        $ws->mergeCells('C5:C6');       $setHdr('C5:C6', 'Check Item', true);
        $ws->mergeCells('D5:E6');       $setHdr('D5:E6', 'Maintenance Standard', true);
        $ws->mergeCells('F5:K5');       $setHdr('F5:K5', 'PM Type', true);
        $ws->mergeCells('L5:M5');       $setHdr('L5:M5', 'Work Time', true);

        // Date columns — N5 = tanggal aktual PM, O5/P5/Q5 = tambahan info
        $maintDate = date('d/m/Y', strtotime($r->maintenance_date));
        $setHdr($c(14) . '5', $maintDate, true);
        $setHdr($c(15) . '5', '.../…..', true);
        $setHdr($c(16) . '5', '.../…..', true);
        $setHdr($c(17) . '5', '.../…..', true);
        $ws->getStyle($c(17) . '5')->getBorders()->getRight()->setBorderStyle(Border::BORDER_MEDIUM);

        // Left & right outer borders row 5
        $ws->getStyle('A5')->getBorders()->getLeft()->setBorderStyle(Border::BORDER_MEDIUM);

        // ── Row 6: sub-headers ───────────────────────────────────────────
        // PM Type sub-headers
        $pmLabels = [self::CF=>'Check', self::CG=>'Lubricate', self::CH=>'Cleaning',
                     self::CJ2=>'Tighten', self::CJ=>'Measure', self::CK=>'Replace'];
        foreach ($pmLabels as $col => $lbl) {
            $cell = $c($col) . '6';
            $ws->setCellValue($cell, $lbl);
            $ws->getStyle($cell)->applyFromArray([
                'font'      => array_merge(self::F_HDR, ['bold' => true]),
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
        }

        // Work Time sub-headers
        foreach (['L6' => "Man\nPower", 'M6' => "Time\n(min)"] as $cell => $lbl) {
            $ws->setCellValue($cell, $lbl);
            $ws->getStyle($cell)->applyFromArray([
                'font'      => array_merge(self::F_HDR, ['bold' => true]),
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
        }

        // Date result sub-headers
        $dateCols = [
            self::CNR => "Hasil\n(Status/Nilai)",
            self::CO  => "Man Power\n(Aktual)",
            self::CP  => "Time\n(Aktual,min)",
            self::CQ  => "Keterangan /\nRemarks",
        ];
        foreach ($dateCols as $col => $lbl) {
            $cell = $c($col) . '6';
            $ws->setCellValue($cell, $lbl);
            $bStyle = [
                'font'      => array_merge(self::F_HDR, ['bold' => true]),
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ];
            if ($col === self::CQ) {
                $bStyle['borders']['right'] = ['borderStyle' => Border::BORDER_MEDIUM];
            }
            $ws->getStyle($cell)->applyFromArray($bStyle);
        }

        // Left border A6
        $ws->getStyle('A6')->getBorders()->getLeft()->setBorderStyle(Border::BORDER_MEDIUM);
    }

    // ════════════════════════════════════════════════════════════════════
    // DATA ROWS (Row 7+)
    // ════════════════════════════════════════════════════════════════════
    private function buildData(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, $items): int
    {
        $c      = fn(int $n) => Coordinate::stringFromColumnIndex($n);
        $row    = 7;
        $lastSub = '__NONE__';

        // PM type → column map
        $pmMap = [
            'Check'     => self::CF,
            'Lubricate' => self::CG,
            'Cleaning'  => self::CH,
            'Tighten'   => self::CJ2,
            'Measure'   => self::CJ,
            'Replace'   => self::CK,
        ];

        // Track sub-equipment groups for B-column merge
        $groupStart = 7;
        $groupSub   = null;

        foreach ($items as $idx => $item) {
            $isLast   = ($idx === count($items) - 1);
            $subEq    = $item->sub_equipment ?? '';
            $isNewSub = ($subEq !== $lastSub);

            if ($isNewSub) {
                // Close previous group
                if ($groupSub !== null && $row - 1 > $groupStart) {
                    try { $ws->mergeCells("B{$groupStart}:B" . ($row - 1)); } catch (\Exception $e) {}
                }
                $groupStart = $row;
                $groupSub   = $subEq;
                $lastSub    = $subEq;
            }

            $ws->getRowDimension($row)->setRowHeight(70);

            // ── Full-row base style ──────────────────────────────────────
            $bottomBorder = $isLast ? Border::BORDER_MEDIUM : Border::BORDER_THIN;
            $ws->getStyle("A{$row}:" . $c(17) . "{$row}")->applyFromArray([
                'font'    => self::F_DATA,
                'borders' => [
                    'left'   => ['borderStyle' => Border::BORDER_MEDIUM],
                    'right'  => ['borderStyle' => Border::BORDER_MEDIUM],
                    'bottom' => ['borderStyle' => $bottomBorder],
                    'top'    => ['borderStyle' => $row === 7 ? Border::BORDER_MEDIUM : Border::BORDER_THIN],
                ],
            ]);

            // Internal thin borders between all cells
            for ($col = self::CN; $col <= self::CQ; $col++) {
                $cell = $c($col) . $row;
                $ws->getStyle($cell)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ]);
            }
            // Re-apply outer borders
            $ws->getStyle("A{$row}")->getBorders()->getLeft()->setBorderStyle(Border::BORDER_MEDIUM);
            $ws->getStyle($c(17) . $row)->getBorders()->getRight()->setBorderStyle(Border::BORDER_MEDIUM);
            if ($isLast) {
                $ws->getStyle("A{$row}:" . $c(17) . "{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);
            }
            if ($row === 7) {
                $ws->getStyle("A{$row}:" . $c(17) . "{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_MEDIUM);
            }

            // ── A: No. ───────────────────────────────────────────────────
            $ws->setCellValue("A{$row}", $item->item_number);
            $ws->getStyle("A{$row}")->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            // ── B: Sub Equipment (value only on first of group) ──────────
            if ($isNewSub) {
                $ws->setCellValue("B{$row}", $subEq);
            }
            $ws->getStyle("B{$row}")->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── C: Check Item ────────────────────────────────────────────
            $ws->setCellValue("C{$row}", $item->check_item);
            $ws->getStyle("C{$row}")->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── D:E: Maintenance Standard (merged) ───────────────────────
            $ws->mergeCells("D{$row}:E{$row}");
            $ws->setCellValue("D{$row}", $item->maintenance_standard);
            $ws->getStyle("D{$row}:E{$row}")->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── F–K: PM Types ─────────────────────────────────────────────
            // pm_types sudah di-decode di fetchItems()
            $planTypes = $item->pm_types ?? [];

            foreach ($pmMap as $pmLabel => $pmCol) {
                $cell = $c($pmCol) . $row;
                $ws->getStyle($cell)->applyFromArray([
                    'font'      => self::F_DATA,
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);
                if (in_array($pmLabel, $planTypes)) {
                    // ■ = wajib dari template (persis seperti template asli)
                    $ws->setCellValue($cell, '■');
                }
                // Jika tidak ada dalam plan, biarkan kosong (sesuai template)
            }

            // ── L: Man Power (plan) ──────────────────────────────────────
            $ws->setCellValue("L{$row}", $item->man_power);
            $ws->getStyle("L{$row}")->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── M: Time (plan) ───────────────────────────────────────────
            $ws->setCellValue("M{$row}", $item->time_minutes);
            $ws->getStyle("M{$row}")->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── N: Hasil (Status + Nilai Ukur) ───────────────────────────
            $statusLabel = match($item->status) {
                'ok' => 'OK', 'ng' => 'NG', 'na' => 'N/A', default => '',
            };
            $measData  = $item->measurements ? json_decode($item->measurements, true) : null;
            $nilaiUkur = $measData['value'] ?? '';
            $hasilText = $nilaiUkur ? "{$statusLabel}\n{$nilaiUkur}" : $statusLabel;

            $ws->setCellValue($c(self::CNR) . $row, $hasilText);
            $ws->getStyle($c(self::CNR) . $row)->applyFromArray([
                'font'      => array_merge(self::F_DATA, ['bold' => ($item->status !== 'pending')]),
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── O: Man Power Aktual ───────────────────────────────────────
            $ws->setCellValue($c(self::CO) . $row, $item->actual_man_power ?? '');
            $ws->getStyle($c(self::CO) . $row)->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── P: Time Aktual ───────────────────────────────────────────
            $ws->setCellValue($c(self::CP) . $row, $item->actual_time_minutes ?? '');
            $ws->getStyle($c(self::CP) . $row)->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            // ── Q: Keterangan / Remarks ───────────────────────────────────
            $rem = $item->remarks ?? '';
            if ($item->requires_action && $item->action_required) {
                $rem .= ($rem ? "\n" : '') . '⚠ ' . $item->action_required;
            }
            $ws->setCellValue($c(self::CQ) . $row, $rem);
            $ws->getStyle($c(self::CQ) . $row)->applyFromArray([
                'font'      => self::F_DATA,
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            $row++;
        }

        // Close final B-column group
        $lastDataRow = $row - 1;
        if ($groupStart < $lastDataRow) {
            try { $ws->mergeCells("B{$groupStart}:B{$lastDataRow}"); } catch (\Exception $e) {}
        }

        return $lastDataRow;
    }

    // ════════════════════════════════════════════════════════════════════
    // FOOTER (Checker & TL Validation)
    // ════════════════════════════════════════════════════════════════════
    private function buildFooter(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, object $r, int $startRow): void
    {
        $c    = fn(int $n) => Coordinate::stringFromColumnIndex($n);

        // Checker row
        $ws->getRowDimension($startRow)->setRowHeight(30);
        $ws->mergeCells("A{$startRow}:M{$startRow}");
        $ws->setCellValue("A{$startRow}", 'Checker');
        $ws->getStyle("A{$startRow}:M{$startRow}")->applyFromArray([
            'font'      => array_merge(self::F_TITLE, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => [
                'bottom' => ['borderStyle' => Border::BORDER_THIN],
                'left'   => ['borderStyle' => Border::BORDER_MEDIUM],
                'right'  => ['borderStyle' => Border::BORDER_THIN],
            ],
        ]);
        $ws->mergeCells($c(14) . $startRow . ':' . $c(17) . $startRow);
        $ws->setCellValue($c(14) . $startRow, $r->checker_name ?? '');
        $ws->getStyle($c(14) . $startRow . ':' . $c(17) . $startRow)->applyFromArray([
            'font'      => self::F_HDR,
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => [
                'bottom' => ['borderStyle' => Border::BORDER_THIN],
                'left'   => ['borderStyle' => Border::BORDER_THIN],
                'right'  => ['borderStyle' => Border::BORDER_MEDIUM],
            ],
        ]);

        // TL Validation row
        $tlRow = $startRow + 1;
        $ws->getRowDimension($tlRow)->setRowHeight(30);
        $ws->mergeCells("A{$tlRow}:M{$tlRow}");
        $ws->setCellValue("A{$tlRow}", 'TL Validation');
        $ws->getStyle("A{$tlRow}:M{$tlRow}")->applyFromArray([
            'font'      => array_merge(self::F_TITLE, ['bold' => true]),
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => [
                'top'    => ['borderStyle' => Border::BORDER_THIN],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                'left'   => ['borderStyle' => Border::BORDER_MEDIUM],
                'right'  => ['borderStyle' => Border::BORDER_THIN],
            ],
        ]);
        $ws->mergeCells($c(14) . $tlRow . ':' . $c(17) . $tlRow);
        $ws->setCellValue($c(14) . $tlRow, $r->validator_name ?? '');
        $ws->getStyle($c(14) . $tlRow . ':' . $c(17) . $tlRow)->applyFromArray([
            'font'      => self::F_HDR,
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => [
                'top'    => ['borderStyle' => Border::BORDER_THIN],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                'left'   => ['borderStyle' => Border::BORDER_THIN],
                'right'  => ['borderStyle' => Border::BORDER_MEDIUM],
            ],
        ]);
    }

    // ════════════════════════════════════════════════════════════════════
    // HELPER: Info block rows 2–4
    // ════════════════════════════════════════════════════════════════════
    private function infoBlock(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws,
        int   $row,
        array $sections
    ): void {
        $c = fn(int $n) => Coordinate::stringFromColumnIndex($n);

        foreach ($sections as $s) {
            $lc1 = $s['lc1']; $lc2 = $s['lc2'];
            $vc1 = $s['vc1']; $vc2 = $s['vc2'];
            $vright = $s['vright'] ?? Border::BORDER_THIN;

            // Label
            if ($lc1 !== $lc2) $ws->mergeCells($c($lc1) . $row . ':' . $c($lc2) . $row);
            $ws->setCellValue($c($lc1) . $row, $s['label']);
            $ws->getStyle($c($lc1) . $row . ':' . $c($lc2) . $row)->applyFromArray([
                'font'      => array_merge(self::F_HDR, ['bold' => true]),
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => [
                    'bottom' => ['borderStyle' => Border::BORDER_THIN],
                    'left'   => ['borderStyle' => ($lc1 === 1 ? Border::BORDER_MEDIUM : Border::BORDER_THIN)],
                    'right'  => ['borderStyle' => Border::BORDER_THIN],
                ],
            ]);

            // Value
            if ($vc1 !== $vc2) $ws->mergeCells($c($vc1) . $row . ':' . $c($vc2) . $row);
            $ws->setCellValue($c($vc1) . $row, $s['val']);
            $ws->getStyle($c($vc1) . $row . ':' . $c($vc2) . $row)->applyFromArray([
                'font'      => array_merge(self::F_HDR, ['bold' => true]),
                'alignment' => ['horizontal' => ($s['valign'] ?? 'center'), 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => [
                    'bottom' => ['borderStyle' => Border::BORDER_THIN],
                    'left'   => ['borderStyle' => Border::BORDER_THIN],
                    'right'  => ['borderStyle' => $vright],
                ],
            ]);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // DATA FETCHERS
    // ════════════════════════════════════════════════════════════════════
    private function fetchRecord(): object
    {
        return DB::table('maintenance_records as mr')
            ->join('equipment as e', 'mr.equipment_id', '=', 'e.id')
            ->join('maintenance_schedules as ms', 'mr.schedule_id', '=', 'ms.id')
            ->join('check_sheet_templates as cst', 'mr.template_id', '=', 'cst.id')
            ->join('users as tech', 'mr.technician_id', '=', 'tech.id')
            ->leftJoin('users as checker', 'mr.checker_id', '=', 'checker.id')
            ->leftJoin('users as validator', 'mr.validator_id', '=', 'validator.id')
            ->select(
                'mr.id', 'mr.record_number', 'mr.maintenance_date',
                'mr.start_time', 'mr.end_time', 'mr.status', 'mr.notes',
                'cst.pm_cycle', 'cst.template_name', 'cst.doc_number',
                'e.equipment_code', 'e.equipment_name', 'e.etm_group',
                DB::raw('NULL as tis_number'),
                'tech.name as technician_name',
                'checker.name as checker_name',
                'validator.name as validator_name',
            )
            ->where('mr.id', $this->recordId)
            ->first();
    }

    private function fetchItems(): \Illuminate\Support\Collection
    {
        return DB::table('maintenance_record_items as mri')
            ->join('check_sheet_items as csi', 'mri.check_item_id', '=', 'csi.id')
            ->select(
                'mri.id', 'mri.status', 'mri.remarks', 'mri.measurements',
                'mri.requires_action', 'mri.action_required',
                'mri.actual_man_power', 'mri.actual_time_minutes',
                'csi.item_number', 'csi.sub_equipment', 'csi.check_item',
                'csi.maintenance_standard', 'csi.pm_types',
                'csi.man_power', 'csi.time_minutes',
            )
            ->where('mri.maintenance_record_id', $this->recordId)
            ->orderBy('csi.item_number')
            ->get()
            ->map(function ($item) {
                // Decode pm_types JSON — pastikan selalu array
                if (is_string($item->pm_types)) {
                    $decoded = json_decode($item->pm_types, true);
                    $item->pm_types = is_array($decoded) ? $decoded : [];
                } elseif (!is_array($item->pm_types)) {
                    $item->pm_types = [];
                }
                return $item;
            });
    }

    private function filename(): string
    {
        $r    = $this->fetchRecord();
        $date = date('Ymd', strtotime($r->maintenance_date));
        $safe = preg_replace('/[^A-Za-z0-9\-_]/', '_', $r->record_number);
        return "PM_{$safe}_{$date}.xlsx";
    }
}