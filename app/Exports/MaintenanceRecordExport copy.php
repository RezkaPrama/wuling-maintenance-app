<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaintenanceRecordExport
{
    private int $recordId;

    // Column mapping (1-based index → letter A…)
    // A=1 No | B=2 Sub Equip | C=3 Check Item | D=4 Maint.Standard
    // E=5 (merged D:E standard) | F=6 Check | G=7 Lubricate | H=8 Cleaning
    // I=9 Tighten | J=10 Measure | K=11 Replace
    // L=12 Man Power | M=13 Time(min)
    // N=14 Status/Result | O=15 Nilai Ukur | P=16 Remarks | Q=17 Foto count
    private const COL_NO          = 1;   // A
    private const COL_SUB         = 2;   // B
    private const COL_ITEM        = 3;   // C
    private const COL_STD         = 4;   // D (merged D:E)
    private const COL_CHECK       = 6;   // F
    private const COL_LUBR        = 7;   // G
    private const COL_CLEAN       = 8;   // H
    private const COL_TIGHT       = 9;   // I
    private const COL_MEAS        = 10;  // J
    private const COL_REPL        = 11;  // K
    private const COL_MP_PLAN     = 12;  // L Man Power plan
    private const COL_TIME_PLAN   = 13;  // M Time plan
    private const COL_MP_ACT      = 14;  // N Man Power aktual
    private const COL_TIME_ACT    = 15;  // O Time aktual
    private const COL_STATUS      = 16;  // P Status (OK/NG/NA)
    private const COL_NILAI       = 17;  // Q Nilai Ukur
    private const COL_REMARKS     = 18;  // R Remarks
    private const COL_ACTION      = 19;  // S Tindakan Lanjut
    private const COL_LAST        = 19;  // S (last column)

    // Row positions
    private const ROW_TITLE    = 1;
    private const ROW_EQUIP    = 2;
    private const ROW_ETM      = 3;
    private const ROW_CYCLE    = 4;
    private const ROW_HDR1     = 5;
    private const ROW_HDR2     = 6;
    private const ROW_DATA_START = 7;

    // Colors
    private const COLOR_HEADER_BG  = '1E3A5F'; // Dark navy — matches web UI
    private const COLOR_HEADER_FG  = 'FFFFFF';
    private const COLOR_SUBROW_BG  = 'EEF2FF'; // Blue tint for sub-equipment rows
    private const COLOR_SUBROW_FG  = '3F51B5';
    private const COLOR_OK_BG      = 'F0FFF6';
    private const COLOR_NG_BG      = 'FFF5F7';
    private const COLOR_NA_BG      = 'F9F9F9';
    private const COLOR_FOOT_BG    = 'F5F8FA';
    private const COLOR_TITLE_BG   = '1E3A5F';
    private const COLOR_TITLE_FG   = 'FFFFFF';

    public function __construct(int $recordId)
    {
        $this->recordId = $recordId;
    }

    // ── Public entry: stream file as download ─────────────────────────────
    public function download(): StreamedResponse
    {
        $spreadsheet = $this->buildSpreadsheet();

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $this->buildFilename(), [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // MAIN BUILD
    // ─────────────────────────────────────────────────────────────────────
    private function buildSpreadsheet(): Spreadsheet
    {
        // ── Fetch data ──────────────────────────────────────────────────
        $record = $this->fetchRecord();
        $items  = $this->fetchItems();

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getProperties()
            ->setCreator('WULING Maintenance System')
            ->setTitle('PM Check Sheet — ' . $record->record_number)
            ->setSubject('Preventive Maintenance Record');

        $ws = $spreadsheet->getActiveSheet();
        $ws->setTitle('Check Sheet ' . $record->pm_cycle);

        // Set default font
        $spreadsheet->getDefaultStyle()->getFont()->setName('Arial')->setSize(8);

        // ── Column widths (mirrors physical template) ───────────────────
        $ws->getColumnDimensionByColumn(self::COL_NO)->setWidth(6);
        $ws->getColumnDimensionByColumn(self::COL_SUB)->setWidth(22);
        $ws->getColumnDimensionByColumn(self::COL_ITEM)->setWidth(42);
        $ws->getColumnDimensionByColumn(self::COL_STD)->setWidth(42);
        $ws->getColumnDimensionByColumn(5)->setWidth(2);   // E spacer
        $ws->getColumnDimensionByColumn(self::COL_CHECK)->setWidth(7);
        $ws->getColumnDimensionByColumn(self::COL_LUBR)->setWidth(9);
        $ws->getColumnDimensionByColumn(self::COL_CLEAN)->setWidth(8);
        $ws->getColumnDimensionByColumn(self::COL_TIGHT)->setWidth(8);
        $ws->getColumnDimensionByColumn(self::COL_MEAS)->setWidth(8);
        $ws->getColumnDimensionByColumn(self::COL_REPL)->setWidth(8);
        $ws->getColumnDimensionByColumn(self::COL_MP_PLAN)->setWidth(9);
        $ws->getColumnDimensionByColumn(self::COL_TIME_PLAN)->setWidth(9);
        $ws->getColumnDimensionByColumn(self::COL_MP_ACT)->setWidth(9);
        $ws->getColumnDimensionByColumn(self::COL_TIME_ACT)->setWidth(9);
        $ws->getColumnDimensionByColumn(self::COL_STATUS)->setWidth(8);
        $ws->getColumnDimensionByColumn(self::COL_NILAI)->setWidth(13);
        $ws->getColumnDimensionByColumn(self::COL_REMARKS)->setWidth(30);
        $ws->getColumnDimensionByColumn(self::COL_ACTION)->setWidth(30);

        // ── Rows 1–6: Header block ──────────────────────────────────────
        $this->buildHeader($ws, $record);

        // ── Rows 5–6: Column headers ────────────────────────────────────
        $this->buildColumnHeaders($ws, $record);

        // ── Rows 7+: Data rows ──────────────────────────────────────────
        $lastDataRow = $this->buildDataRows($ws, $items);

        // ── Footer rows ─────────────────────────────────────────────────
        $this->buildFooter($ws, $record, $lastDataRow + 1);

        // ── Print setup ─────────────────────────────────────────────────
        $ws->getPageSetup()->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE);
        $ws->getPageSetup()->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A3);
        $ws->getPageSetup()->setFitToPage(true);
        $ws->getPageSetup()->setFitToWidth(1);
        $ws->getPageSetup()->setFitToHeight(0);
        $ws->setShowGridlines(false);

        // Freeze pane below header
        $ws->freezePane('A7');

        return $spreadsheet;
    }

    // ─────────────────────────────────────────────────────────────────────
    // HEADER (rows 1–4)
    // ─────────────────────────────────────────────────────────────────────
    private function buildHeader(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, object $record): void
    {
        $last = Coordinate::stringFromColumnIndex(self::COL_LAST);
        $docLabelCol = Coordinate::stringFromColumnIndex(self::COL_NILAI); // "Q"

        // Row 1 — Title
        $ws->getRowDimension(1)->setRowHeight(36);
        $ws->mergeCells("A1:{$docLabelCol}1");
        $ws->setCellValue('A1', 'Preventive Maintenance Check Sheet');
        $ws->mergeCells(Coordinate::stringFromColumnIndex(self::COL_REMARKS) . '1:' . $last . '1');
        $ws->setCellValue(Coordinate::stringFromColumnIndex(self::COL_REMARKS) . '1', 'Doc No : ' . ($record->doc_number ?? 'Form 05.85-05(0/A)'));
        $this->applyTitleStyle($ws, "A1:{$last}1");

        // Row 2 — Equipment
        $ws->getRowDimension(2)->setRowHeight(22);
        $this->setMergedHeaderRow($ws, 2, [
            ['label' => 'Equipment :', 'value' => $record->equipment_name, 'label_col' => 1, 'value_col' => 3, 'value_end' => 5],
            ['label' => 'PM Number :', 'value' => $record->record_number,  'label_col' => 6, 'value_col' => 9, 'value_end' => 12],
            ['label' => 'Equ. No :',   'value' => $record->equipment_code, 'label_col' => 14, 'value_col' => 15, 'value_end' => self::COL_LAST],
        ]);

        // Row 3 — ETM / TIS / Year
        $ws->getRowDimension(3)->setRowHeight(20);
        $this->setMergedHeaderRow($ws, 3, [
            ['label' => 'ETM Group :', 'value' => $record->etm_group,  'label_col' => 1, 'value_col' => 3, 'value_end' => 5],
            ['label' => 'TIS Number :', 'value' => ($record->tis_number ?? '—'), 'label_col' => 6, 'value_col' => 9, 'value_end' => 12],
            ['label' => 'Year',        'value' => date('Y', strtotime($record->maintenance_date)), 'label_col' => 14, 'value_col' => 15, 'value_end' => 15],
            ['label' => 'PM Status',   'value' => strtoupper($record->status), 'label_col' => 16, 'value_col' => 17, 'value_end' => self::COL_LAST],
        ]);

        // Row 4 — PM Cycle / Prepared by / Checked by
        $ws->getRowDimension(4)->setRowHeight(20);
        $this->setMergedHeaderRow($ws, 4, [
            ['label' => 'PM Cycle',     'value' => $record->pm_cycle,           'label_col' => 1,  'value_col' => 3,  'value_end' => 5],
            ['label' => 'Prepared by :', 'value' => $record->technician_name,   'label_col' => 6,  'value_col' => 9,  'value_end' => 13],
            ['label' => 'Checked by :', 'value' => ($record->checker_name ?? ''), 'label_col' => 14, 'value_col' => 15, 'value_end' => self::COL_LAST],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // COLUMN HEADERS (rows 5–6)
    // ─────────────────────────────────────────────────────────────────────
    private function buildColumnHeaders(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, object $record): void
    {
        $last = Coordinate::stringFromColumnIndex(self::COL_LAST);
        $ws->getRowDimension(self::ROW_HDR1)->setRowHeight(30);
        $ws->getRowDimension(self::ROW_HDR2)->setRowHeight(40);

        $hdrStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => self::COLOR_HEADER_FG], 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '2D5186']]],
        ];

        // Row 5+6 — No. (merged)
        $this->mergeAndStyle($ws, 'A5:A6', 'No.', $hdrStyle);

        // Sub Equipment (merged)
        $subC = Coordinate::stringFromColumnIndex(self::COL_SUB);
        $this->mergeAndStyle($ws, "{$subC}5:{$subC}6", 'Sub Equipment', $hdrStyle);

        // Check Item (merged)
        $itmC = Coordinate::stringFromColumnIndex(self::COL_ITEM);
        $this->mergeAndStyle($ws, "{$itmC}5:{$itmC}6", 'Check Item', $hdrStyle);

        // Maintenance Standard (merged D5:E6)
        $stdC  = Coordinate::stringFromColumnIndex(self::COL_STD);
        $std2C = Coordinate::stringFromColumnIndex(5);
        $this->mergeAndStyle($ws, "{$stdC}5:{$std2C}6", 'Maintenance Standard', $hdrStyle);

        // PM Type group header (F5:K5)
        $pmStart = Coordinate::stringFromColumnIndex(self::COL_CHECK);
        $pmEnd   = Coordinate::stringFromColumnIndex(self::COL_REPL);
        $this->mergeAndStyle($ws, "{$pmStart}5:{$pmEnd}5", 'PM Type', $hdrStyle);

        // PM Type sub-headers (row 6)
        $pmCols = [
            self::COL_CHECK => 'Check',
            self::COL_LUBR  => 'Lubri-\ncate',
            self::COL_CLEAN => 'Clean-\ning',
            self::COL_TIGHT => 'Tighten',
            self::COL_MEAS  => 'Measure',
            self::COL_REPL  => 'Replace',
        ];
        foreach ($pmCols as $colNum => $label) {
            $c = Coordinate::stringFromColumnIndex($colNum);
            $ws->setCellValue("{$c}6", str_replace('\n', "\n", $label));
            $ws->getStyle("{$c}6")->applyFromArray($hdrStyle);
        }

        // Work Time group header (L5:M5) Plan
        $mpPlanC   = Coordinate::stringFromColumnIndex(self::COL_MP_PLAN);
        $timePlanC = Coordinate::stringFromColumnIndex(self::COL_TIME_PLAN);
        $this->mergeAndStyle($ws, "{$mpPlanC}5:{$timePlanC}5", "Work Time\n(Plan)", $hdrStyle);
        $ws->setCellValue("{$mpPlanC}6", "Man\nPower\n(org)");
        $ws->getStyle("{$mpPlanC}6")->applyFromArray($hdrStyle);
        $ws->setCellValue("{$timePlanC}6", "Time\n(min)");
        $ws->getStyle("{$timePlanC}6")->applyFromArray($hdrStyle);

        // Work Time Aktual (N5:O5)
        $mpActC   = Coordinate::stringFromColumnIndex(self::COL_MP_ACT);
        $timeActC = Coordinate::stringFromColumnIndex(self::COL_TIME_ACT);
        $this->mergeAndStyle($ws, "{$mpActC}5:{$timeActC}5", "Work Time\n(Aktual)", $hdrStyle);
        $ws->setCellValue("{$mpActC}6", "Man\nPower\n(org)");
        $ws->getStyle("{$mpActC}6")->applyFromArray($hdrStyle);
        $ws->setCellValue("{$timeActC}6", "Time\n(min)");
        $ws->getStyle("{$timeActC}6")->applyFromArray($hdrStyle);

        // Hasil Pemeriksaan (P5:Q5)
        $statC  = Coordinate::stringFromColumnIndex(self::COL_STATUS);
        $nilaiC = Coordinate::stringFromColumnIndex(self::COL_NILAI);
        $maintDate = date('d/m/Y', strtotime($record->maintenance_date));
        $this->mergeAndStyle($ws, "{$statC}5:{$nilaiC}5", "Hasil Pemeriksaan\n{$maintDate}", $hdrStyle);
        $ws->setCellValue("{$statC}6", "Status\n(OK/NG/NA)");
        $ws->getStyle("{$statC}6")->applyFromArray($hdrStyle);
        $ws->setCellValue("{$nilaiC}6", "Nilai\nUkur");
        $ws->getStyle("{$nilaiC}6")->applyFromArray($hdrStyle);

        // Remarks (merged R5:R6)
        $remC = Coordinate::stringFromColumnIndex(self::COL_REMARKS);
        $this->mergeAndStyle($ws, "{$remC}5:{$remC}6", "Keterangan /\nRemarks", $hdrStyle);

        // Tindakan Lanjut (merged S5:S6)
        $actC = Coordinate::stringFromColumnIndex(self::COL_ACTION);
        $this->mergeAndStyle($ws, "{$actC}5:{$actC}6", "Tindakan\nLanjut", $hdrStyle);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATA ROWS
    // ─────────────────────────────────────────────────────────────────────
    private function buildDataRows(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, $items): int
    {
        $rowNum      = self::ROW_DATA_START;
        $lastSubEq   = '__INIT__';
        $pmTypeOrder = ['Check', 'Lubricate', 'Cleaning', 'Tighten', 'Measure', 'Replace'];
        $pmColMap    = [
            'Check'     => self::COL_CHECK,
            'Lubricate' => self::COL_LUBR,
            'Cleaning'  => self::COL_CLEAN,
            'Tighten'   => self::COL_TIGHT,
            'Measure'   => self::COL_MEAS,
            'Replace'   => self::COL_REPL,
        ];

        foreach ($items as $item) {
            // ── Sub-equipment divider row ──────────────────────────────
            if ($item->sub_equipment !== $lastSubEq) {
                $lastSubEq = $item->sub_equipment;
                $last = Coordinate::stringFromColumnIndex(self::COL_LAST);
                $ws->getRowDimension($rowNum)->setRowHeight(18);
                $ws->mergeCells("A{$rowNum}:{$last}{$rowNum}");
                $ws->setCellValue("A{$rowNum}", $item->sub_equipment ?: 'General');
                $ws->getStyle("A{$rowNum}:{$last}{$rowNum}")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => self::COLOR_SUBROW_FG], 'size' => 8],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_SUBROW_BG]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
                    'borders'   => [
                        'top'    => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => 'C5CAE9']],
                        'bottom' => ['borderStyle' => Border::BORDER_THIN],
                        'left'   => ['borderStyle' => Border::BORDER_MEDIUM],
                        'right'  => ['borderStyle' => Border::BORDER_MEDIUM],
                    ],
                ]);
                $rowNum++;
            }

            // ── Data row background based on status ────────────────────
            $rowBg = match ($item->status) {
                'ok' => self::COLOR_OK_BG,
                'ng' => self::COLOR_NG_BG,
                'na' => self::COLOR_NA_BG,
                default => 'FFFFFF',
            };

            $ws->getRowDimension($rowNum)->setRowHeight(55);

            $baseStyle = [
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $rowBg]],
                'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'DEE2E6']]],
                'font'      => ['size' => 8],
            ];

            $last = Coordinate::stringFromColumnIndex(self::COL_LAST);
            $ws->getStyle("A{$rowNum}:{$last}{$rowNum}")->applyFromArray($baseStyle);

            // — No. —
            $ws->setCellValue('A' . $rowNum, $item->item_number);
            $ws->getStyle('A' . $rowNum)->applyFromArray([
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_TOP],
                'font'      => ['bold' => false, 'color' => ['rgb' => '6C757D']],
                'borders'   => ['left' => ['borderStyle' => Border::BORDER_MEDIUM]],
            ]);

            // — Sub Equipment —
            $subC = Coordinate::stringFromColumnIndex(self::COL_SUB);
            $ws->setCellValue("{$subC}{$rowNum}", $item->sub_equipment);
            $ws->getStyle("{$subC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_CENTER)
               ->setVertical(Alignment::VERTICAL_TOP)
               ->setWrapText(true);

            // — Check Item —
            $itmC = Coordinate::stringFromColumnIndex(self::COL_ITEM);
            $ws->setCellValue("{$itmC}{$rowNum}", $item->check_item);
            $ws->getStyle("{$itmC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_LEFT)
               ->setVertical(Alignment::VERTICAL_TOP)
               ->setWrapText(true);

            // — Maintenance Standard (D:E merged) —
            $stdC  = Coordinate::stringFromColumnIndex(self::COL_STD);
            $std2C = Coordinate::stringFromColumnIndex(5);
            $ws->mergeCells("{$stdC}{$rowNum}:{$std2C}{$rowNum}");
            $ws->setCellValue("{$stdC}{$rowNum}", $item->maintenance_standard);
            $ws->getStyle("{$stdC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_LEFT)
               ->setVertical(Alignment::VERTICAL_TOP)
               ->setWrapText(true);

            // — PM Types —
            $planTypes = $item->pm_types ?? [];
            $doneTypes = $item->completed_pm_types ?? [];
            foreach ($pmColMap as $label => $colNum) {
                $c       = Coordinate::stringFromColumnIndex($colNum);
                $isPlan  = in_array($label, $planTypes);
                $isDone  = in_array($label, $doneTypes);
                $cellVal = '';
                if ($isPlan && $isDone)  $cellVal = '✓';   // plan + done
                elseif ($isPlan)         $cellVal = '■';   // plan not done
                elseif ($isDone)         $cellVal = '○';   // extra (done, not plan)
                $ws->setCellValue("{$c}{$rowNum}", $cellVal);
                $ws->getStyle("{$c}{$rowNum}")->applyFromArray([
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'font'      => ['size' => 10, 'color' => ['rgb' => $isPlan && !$isDone ? 'F1416C' : ($isDone ? '009EF7' : '6C757D')]],
                ]);
            }

            // — Man Power Plan —
            $mpPlanC = Coordinate::stringFromColumnIndex(self::COL_MP_PLAN);
            $ws->setCellValue("{$mpPlanC}{$rowNum}", $item->man_power);
            $ws->getStyle("{$mpPlanC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_CENTER)
               ->setVertical(Alignment::VERTICAL_CENTER);

            // — Time Plan —
            $timePlanC = Coordinate::stringFromColumnIndex(self::COL_TIME_PLAN);
            $ws->setCellValue("{$timePlanC}{$rowNum}", $item->time_minutes);
            $ws->getStyle("{$timePlanC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_CENTER)
               ->setVertical(Alignment::VERTICAL_CENTER);

            // — Man Power Aktual —
            $mpActC = Coordinate::stringFromColumnIndex(self::COL_MP_ACT);
            $ws->setCellValue("{$mpActC}{$rowNum}", $item->actual_man_power);
            $ws->getStyle("{$mpActC}{$rowNum}")->applyFromArray([
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'font'      => ['bold' => true, 'color' => ['rgb' => '009EF7']],
            ]);

            // — Time Aktual —
            $timeActC = Coordinate::stringFromColumnIndex(self::COL_TIME_ACT);
            $ws->setCellValue("{$timeActC}{$rowNum}", $item->actual_time_minutes);
            $ws->getStyle("{$timeActC}{$rowNum}")->applyFromArray([
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'font'      => ['bold' => true, 'color' => ['rgb' => '009EF7']],
            ]);

            // — Status Result —
            $statC    = Coordinate::stringFromColumnIndex(self::COL_STATUS);
            $statLabel = strtoupper($item->status === 'na' ? 'N/A' : $item->status);
            $statColor = match ($item->status) {
                'ok'    => '50CD89',
                'ng'    => 'F1416C',
                'na'    => 'B5B5C3',
                default => 'FFC107',
            };
            $ws->setCellValue("{$statC}{$rowNum}", $statLabel);
            $ws->getStyle("{$statC}{$rowNum}")->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['rgb' => $statColor], 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            // — Nilai Ukur —
            $nilaiC   = Coordinate::stringFromColumnIndex(self::COL_NILAI);
            $measData = $item->measurements ? json_decode($item->measurements, true) : null;
            $ws->setCellValue("{$nilaiC}{$rowNum}", $measData['value'] ?? '');
            $ws->getStyle("{$nilaiC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_CENTER)
               ->setVertical(Alignment::VERTICAL_CENTER);

            // — Remarks —
            $remC = Coordinate::stringFromColumnIndex(self::COL_REMARKS);
            $ws->setCellValue("{$remC}{$rowNum}", $item->remarks ?? '');
            $ws->getStyle("{$remC}{$rowNum}")->getAlignment()
               ->setHorizontal(Alignment::HORIZONTAL_LEFT)
               ->setVertical(Alignment::VERTICAL_TOP)
               ->setWrapText(true);

            // — Tindakan Lanjut —
            $actC = Coordinate::stringFromColumnIndex(self::COL_ACTION);
            $actionText = '';
            if ($item->requires_action) {
                $actionText = '⚠ ' . ($item->action_required ?? '(Perlu tindak lanjut)');
            }
            $ws->setCellValue("{$actC}{$rowNum}", $actionText);
            $ws->getStyle("{$actC}{$rowNum}")->applyFromArray([
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                'font'      => ['color' => ['rgb' => $item->requires_action ? 'D07800' : '000000']],
            ]);

            // Left border emphasis based on status
            $ws->getStyle("A{$rowNum}")->getBorders()->getLeft()
               ->setBorderStyle(Border::BORDER_MEDIUM)
               ->getColor()->setRGB($statColor);

            $rowNum++;
        }

        return $rowNum - 1; // last filled row
    }

    // ─────────────────────────────────────────────────────────────────────
    // FOOTER
    // ─────────────────────────────────────────────────────────────────────
    private function buildFooter(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, object $record, int $startRow): void
    {
        $last  = Coordinate::stringFromColumnIndex(self::COL_LAST);
        $statC = Coordinate::stringFromColumnIndex(self::COL_STATUS);

        // ── Summary row ────────────────────────────────────────────────
        $ws->getRowDimension($startRow)->setRowHeight(20);
        $ws->mergeCells("A{$startRow}:E{$startRow}");
        $ws->setCellValue("A{$startRow}", 'RINGKASAN');
        $ws->getStyle("A{$startRow}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_FOOT_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);

        // Total items, OK, NG, NA from formula range
        $dataStart = self::ROW_DATA_START;
        $dataEnd   = $startRow - 1;
        $statusCol = Coordinate::stringFromColumnIndex(self::COL_STATUS);

        // ── Signature / validation footer ─────────────────────────────
        $footRow  = $startRow + 2;
        $footRow2 = $footRow + 4;

        $ws->getRowDimension($footRow)->setRowHeight(16);
        $ws->getRowDimension($footRow2)->setRowHeight(16);

        $footStyle = [
            'font'      => ['bold' => true, 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_FOOT_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'DEE2E6']]],
        ];

        // Prepared by block
        $ws->mergeCells("A{$footRow}:E{$footRow}");
        $ws->setCellValue("A{$footRow}", 'Dibuat oleh (Teknisi)');
        $ws->getStyle("A{$footRow}:E{$footRow}")->applyFromArray($footStyle);
        $ws->mergeCells("A{$footRow2}:E{$footRow2}");
        $ws->setCellValue("A{$footRow2}", $record->technician_name ?? '');
        $ws->getStyle("A{$footRow2}:E{$footRow2}")->applyFromArray(array_merge($footStyle, ['font' => ['bold' => false, 'size' => 8]]));

        // Date on record
        $ws->mergeCells("F{$footRow}:J{$footRow}");
        $ws->setCellValue("F{$footRow}", 'Tanggal Pengerjaan');
        $ws->getStyle("F{$footRow}:J{$footRow}")->applyFromArray($footStyle);
        $ws->mergeCells("F{$footRow2}:J{$footRow2}");
        $ws->setCellValue("F{$footRow2}", date('d M Y', strtotime($record->maintenance_date)) . ' · ' . $record->start_time . ' – ' . ($record->end_time ?? '—'));
        $ws->getStyle("F{$footRow2}:J{$footRow2}")->applyFromArray(array_merge($footStyle, ['font' => ['bold' => false, 'size' => 8]]));

        // Checker block
        $ws->mergeCells("K{$footRow}:{$statC}{$footRow}");
        $ws->setCellValue("K{$footRow}", 'Diperiksa oleh (Checker)');
        $ws->getStyle("K{$footRow}:{$statC}{$footRow}")->applyFromArray($footStyle);
        $ws->mergeCells("K{$footRow2}:{$statC}{$footRow2}");
        $ws->setCellValue("K{$footRow2}", $record->checker_name ?? '(menunggu)');
        $ws->getStyle("K{$footRow2}:{$statC}{$footRow2}")->applyFromArray(array_merge($footStyle, ['font' => ['bold' => false, 'size' => 8]]));

        // Validator block
        $remC = Coordinate::stringFromColumnIndex(self::COL_REMARKS);
        $ws->mergeCells("{$remC}{$footRow}:{$last}{$footRow}");
        $ws->setCellValue("{$remC}{$footRow}", 'Divalidasi oleh (TL)');
        $ws->getStyle("{$remC}{$footRow}:{$last}{$footRow}")->applyFromArray($footStyle);
        $ws->mergeCells("{$remC}{$footRow2}:{$last}{$footRow2}");
        $ws->setCellValue("{$remC}{$footRow2}", $record->validator_name ?? '(menunggu)');
        $ws->getStyle("{$remC}{$footRow2}:{$last}{$footRow2}")->applyFromArray(array_merge($footStyle, ['font' => ['bold' => false, 'size' => 8]]));

        // Bottom border on last row
        $ws->getStyle("A{$footRow2}:{$last}{$footRow2}")->getBorders()
           ->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);
    }

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────
    private function applyTitleStyle(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => self::COLOR_TITLE_FG], 'size' => 12],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_TITLE_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '2D5186']]],
        ]);
        $ws->getRowDimension(1)->setRowHeight(36);
    }

    private function setMergedHeaderRow(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws,
        int $row,
        array $sections
    ): void {
        $baseStyle = [
            'font'      => ['bold' => true, 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5F8FA']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => false],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'DEE2E6']]],
        ];
        foreach ($sections as $sec) {
            $labelC = Coordinate::stringFromColumnIndex($sec['label_col']);
            $valC   = Coordinate::stringFromColumnIndex($sec['value_col']);
            $valEnd = Coordinate::stringFromColumnIndex($sec['value_end']);

            // Label cell
            $ws->setCellValue("{$labelC}{$row}", $sec['label']);
            $ws->getStyle("{$labelC}{$row}")->applyFromArray(array_merge($baseStyle, [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]));

            // Value cells (merged)
            if ($sec['value_col'] !== $sec['value_end']) {
                $ws->mergeCells("{$valC}{$row}:{$valEnd}{$row}");
            }
            $ws->setCellValue("{$valC}{$row}", $sec['value']);
            $ws->getStyle("{$valC}{$row}:{$valEnd}{$row}")->applyFromArray(array_merge($baseStyle, [
                'font'      => ['bold' => false, 'size' => 8],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM]],
            ]));
        }
    }

    private function mergeAndStyle(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws,
        string $range,
        string $value,
        array $style
    ): void {
        $ws->mergeCells($range);
        [$start] = explode(':', $range);
        $ws->setCellValue($start, $value);
        $ws->getStyle($range)->applyFromArray($style);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATA FETCHERS
    // ─────────────────────────────────────────────────────────────────────
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
                'mr.id',
                'mr.record_number',
                'mr.maintenance_date',
                'mr.start_time',
                'mr.end_time',
                'mr.status',
                'mr.notes',
                'cst.pm_cycle',
                'cst.template_name',
                'cst.doc_number',
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
                'e.location',
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
                'mri.id',
                'mri.status',
                'mri.remarks',
                'mri.measurements',
                'mri.photos',
                'mri.requires_action',
                'mri.action_required',
                'mri.actual_man_power',
                'mri.actual_time_minutes',
                'csi.item_number',
                'csi.sub_equipment',
                'csi.check_item',
                'csi.maintenance_standard',
                'csi.pm_types',
                'csi.man_power',
                'csi.time_minutes',
            )
            ->where('mri.maintenance_record_id', $this->recordId)
            ->orderBy('csi.item_number')
            ->get()
            ->map(function ($item) {
                $item->pm_types           = $item->pm_types ? json_decode($item->pm_types, true) : [];
                $item->completed_pm_types = [];  // not stored separately yet — extend if needed
                return $item;
            });
    }

    private function buildFilename(): string
    {
        $record = $this->fetchRecord();
        $date   = date('Ymd', strtotime($record->maintenance_date));
        $safe   = preg_replace('/[^A-Za-z0-9\-_]/', '_', $record->record_number);
        return "PM_{$safe}_{$date}.xlsx";
    }
}