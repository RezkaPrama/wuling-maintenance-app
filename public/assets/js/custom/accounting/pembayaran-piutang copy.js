'use strict';

var PembayaranPiutang = (function () {
    var table;
    var selectedCustomer    = null;
    var customerPiutangData = [];

    // Daftar bank Indonesia
    var BANK_INDONESIA = [
        // Bank BUMN
        'Bank Mandiri', 'Bank BRI', 'Bank BNI', 'Bank BTN', 'Bank BSI',
        // Bank Swasta Nasional
        'Bank BCA', 'Bank CIMB Niaga', 'Bank Danamon', 'Bank Permata',
        'Bank Panin', 'Bank OCBC NISP', 'Bank Maybank Indonesia',
        'Bank UOB Indonesia', 'Bank HSBC Indonesia', 'Bank DBS Indonesia',
        'Bank Commonwealth', 'Bank Citibank Indonesia', 'Bank Standard Chartered',
        'Bank Mega', 'Bank Bukopin', 'Bank Sinarmas', 'Bank MNC',
        'Bank BTPN', 'Bank Allo', 'Bank Jago', 'Bank Seabank', 'Bank Neo Commerce',
        'Bank Amar', 'Bank Sahabat Sampoerna', 'Bank QNB Indonesia',
        'Bank Resona Perdania', 'Bank ANZ Indonesia',
        // Bank Daerah (BPD)
        'Bank DKI', 'Bank Jabar Banten (BJB)', 'Bank Jateng', 'Bank Jatim',
        'Bank DIY', 'Bank Sumut', 'Bank Sumsel Babel', 'Bank Sumbar',
        'Bank Riau Kepri', 'Bank Bengkulu', 'Bank Jambi', 'Bank Lampung',
        'Bank Aceh', 'Bank Kaltimtara', 'Bank Kalteng', 'Bank Kalsel',
        'Bank Kalbar', 'Bank Sulselbar', 'Bank Sulteng', 'Bank Sultenggara',
        'Bank Sulut Go', 'Bank Maluku Malut', 'Bank Papua', 'Bank NTB Syariah',
        'Bank NTT', 'Bank Bali', 'Bank Banten',
        // Bank Syariah
        'Bank Muamalat', 'Bank CIMB Niaga Syariah', 'Bank Mega Syariah',
        'Bank Victoria Syariah', 'Bank Panin Dubai Syariah',
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Init DataTable (grouped by customer)
    // ─────────────────────────────────────────────────────────────────────────
    function initTable() {
        table = $('#piutang-table').DataTable({
            processing: true,
            serverSide: true,
            scrollX:    true,
            autoWidth:  false,
            ajax: {
                url: window.location.href,
                data: function (d) {
                    d.grouped     = 1;
                    d.customer_id = $('#customer_id').val();
                    d.no_piutang  = $('#no_piutang').val();
                    d.start_date  = $('#start_date').val();
                    d.end_date    = $('#end_date').val();
                }
            },
            columns: [
                {
                    data:       'checkbox',
                    orderable:  false,
                    searchable: false,
                    className:  'text-center',
                    width:      '40px'
                },
                {
                    data:       'DT_RowIndex',
                    orderable:  false,
                    searchable: false,
                    className:  'text-center',
                    width:      '40px'
                },
                {
                    data:      'customer_name',
                    className: 'text-start fw-bold',
                    width:     '220px'
                },
                {
                    data:       'expand_btn',
                    orderable:  false,
                    searchable: false,
                    className:  'text-center',
                    width:      '130px'
                },
                {
                    data:      'jumlah_piutang',
                    className: 'text-center',
                    width:     '110px'
                },
                {
                    data:      'total_netto_formatted',
                    className: 'text-end',
                    width:     '150px'
                },
                {
                    data:       'total_sudah_bayar_formatted',
                    orderable:  false,
                    className:  'text-end',
                    width:      '150px'
                },
                {
                    data:       'total_sisa_formatted',
                    orderable:  false,
                    className:  'text-end',
                    width:      '150px'
                },
                {
                    data:       'action',
                    orderable:  false,
                    searchable: false,
                    className:  'text-center',
                    width:      '100px'
                },
            ],
            order: [[2, 'asc']],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Indonesian.json'
            },
            drawCallback: function () {
                bindRowEvents();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bind events on table rows
    // ─────────────────────────────────────────────────────────────────────────
    function bindRowEvents() {
        // ── Expand child row ─────────────────────────────────────────────
        $(document).off('click', '.btn-expand').on('click', '.btn-expand', function () {
            var btn          = $(this);
            var customerId   = btn.data('customer-id');
            var customerName = btn.data('customer-name');
            var row          = table.row(btn.closest('tr'));
            var tr           = btn.closest('tr');

            if (row.child.isShown()) {
                row.child.hide();
                tr.removeClass('shown');
                btn.html(
                    '<i class="bi bi-chevron-down"></i> '
                    + btn.data('jumlah-piutang') + ' Piutang'
                );
                return;
            }

            btn.html('<i class="bi bi-arrow-clockwise spin"></i> Loading...');

            $.get(window.routeGetDetail, { customer_id: customerId }, function (res) {
                if (res.success) {
                    row.child(buildDetailTable(res.data, customerId, customerName)).show();
                    tr.addClass('shown');
                    btn.data('jumlah-piutang', res.data.length);
                    btn.html(
                        '<i class="bi bi-chevron-up"></i> '
                        + res.data.length + ' Piutang'
                    );
                }
            }).fail(function () {
                btn.html('<i class="bi bi-chevron-down"></i> Error');
            });
        });

        // ── Bayar per customer (dari tabel utama) ─────────────────────────
        $(document).off('click', '.btn-bayar-customer')
                   .on('click',  '.btn-bayar-customer', function () {
            var customerId   = $(this).data('customer-id');
            var customerName = $(this).data('customer-name');
            openPaymentModal(customerId, customerName);
        });

        // ── Bayar dari child row ──────────────────────────────────────────
        $(document).off('click', '.btn-bayar-from-detail')
                   .on('click',  '.btn-bayar-from-detail', function () {
            var customerId   = $(this).data('customer-id');
            var customerName = $(this).data('customer-name');
            openPaymentModal(customerId, customerName);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build child detail table HTML (dengan history pembayaran)
    // ─────────────────────────────────────────────────────────────────────────
    function buildDetailTable(data, customerId, customerName) {
        if (!data || !data.length) {
            return '<div class="p-3 text-muted fst-italic">Tidak ada piutang aktif.</div>';
        }

        var html = ''
            + '<div class="p-3 bg-light border-top">'
            + '  <div class="d-flex justify-content-between align-items-center mb-3">'
            + '    <h6 class="fw-bold mb-0">'
            + '      <i class="bi bi-list-ul me-1"></i>Detail Piutang — '
            + escHtml(customerName)
            + '    </h6>'
            + '    <button class="btn btn-sm btn-success btn-bayar-from-detail"'
            + '            data-customer-id="' + customerId + '"'
            + '            data-customer-name="' + escHtml(customerName) + '">'
            + '      <i class="bi bi-credit-card"></i> Bayar Piutang Customer Ini'
            + '    </button>'
            + '  </div>'
            + '  <div class="table-responsive" style="max-width:100%;overflow-x:auto;">'
            + '  <table class="table table-sm table-bordered table-hover child-detail-table mb-0" style="min-width:1400px;">'
            + '    <thead class="table-dark">'
            + '      <tr>'
            + '        <th class="text-center" style="width:40px">#</th>'
            + '        <th style="width:140px">No. Piutang</th>'
            + '        <th style="width:140px">No. Penjualan</th>'
            + '        <th class="text-center" style="width:110px">Tgl Faktur</th>'
            + '        <th class="text-center" style="width:110px">Tgl Terima</th>'
            + '        <th class="text-center" style="width:120px">Jatuh Tempo</th>'
            + '        <th class="text-end" style="width:140px">Netto Asal</th>'
            + '        <th class="text-end" style="width:140px">Sudah Dibayar</th>'
            + '        <th class="text-end" style="width:140px">Sisa Piutang</th>'
            + '        <th class="text-center" style="width:130px">Progress</th>'
            + '        <th class="text-start" style="width:220px">History Pembayaran</th>'
            + '        <th class="text-center" style="width:120px">Status</th>'
            + '        <th class="text-center" style="width:120px">Create By</th>'
            + '      </tr>'
            + '    </thead>'
            + '    <tbody>';

        data.forEach(function (p, i) {
            var rowClass     = p.is_overdue && p.sisa_piutang > 0 ? 'table-danger' : '';
            var progressColor = p.persen_terbayar >= 100 ? 'success'
                              : p.persen_terbayar >= 50  ? 'warning' : 'danger';

            var statusBadge;
            if (p.sisa_piutang <= 0) {
                statusBadge = '<span class="badge badge-light-success">'
                    + '<i class="bi bi-check-circle"></i> Lunas</span>';
            } else if (p.has_payment) {
                statusBadge = '<span class="badge badge-light-warning">'
                    + '<i class="bi bi-hourglass-split"></i> Sebagian</span>';
            } else {
                statusBadge = '<span class="badge badge-light-danger">Belum Bayar</span>';
            }
            if (p.is_overdue && p.sisa_piutang > 0) {
                statusBadge += '<br><span class="badge badge-danger mt-1">'
                    + '<i class="bi bi-exclamation-triangle"></i> Overdue</span>';
            }

            var historyHtml = buildHistoryHtml(p);

            html += '<tr class="' + rowClass + '">'
                + '<td class="text-center">' + (i + 1) + '</td>'
                + '<td><code>' + escHtml(p.no_piutang) + '</code></td>'
                + '<td><code>' + escHtml(p.no_penjualan || '-') + '</code></td>'
                + '<td class="text-center">' + (p.tgl_faktur || '-') + '</td>'
                + '<td class="text-center">' + p.tgl_terima + '</td>'
                + '<td class="text-center">' + p.tgl_jatuh_tempo + '</td>'
                + '<td class="text-end">' + p.netto_formatted + '</td>'
                + '<td class="text-end fw-bold text-success">'
                +   (p.total_sudah_bayar > 0
                        ? '<i class="bi bi-check-circle-fill me-1"></i>' + p.total_sudah_bayar_formatted
                        : '<span class="text-muted">-</span>')
                + '</td>'
                + '<td class="text-end fw-bold ' + (p.sisa_piutang <= 0 ? 'text-success' : 'text-danger') + '">'
                +   (p.sisa_piutang <= 0 ? 'LUNAS' : p.sisa_piutang_formatted)
                + '</td>'
                + '<td>'
                +   '<div class="d-flex align-items-center gap-2">'
                +     '<div class="progress flex-grow-1" style="height:8px;min-width:60px">'
                +       '<div class="progress-bar bg-' + progressColor + '"'
                +            ' style="width:' + p.persen_terbayar + '%"'
                +            ' aria-valuenow="' + p.persen_terbayar + '"'
                +            ' aria-valuemin="0" aria-valuemax="100"></div>'
                +     '</div>'
                +     '<small class="text-muted fw-bold">' + p.persen_terbayar + '%</small>'
                +   '</div>'
                + '</td>'
                + '<td>' + historyHtml + '</td>'
                + '<td class="text-center">' + statusBadge + '</td>'
                + '<td class="text-center">'
                +   '<div class="fs-8 fw-bold text-primary">'
                +     '<i class="bi bi-person-circle me-1"></i>' + escHtml(p.create_by || '-')
                +   '</div>'
                + '</tr>';
        });

        html += '    </tbody>'
            + '  </table>'
            + '  </div>'
            + '</div>';

        return html;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build history pembayaran HTML (per faktur)
    // ─────────────────────────────────────────────────────────────────────────
    function buildHistoryHtml(p) {
        if (!p.has_payment || !p.history_pembayaran || !p.history_pembayaran.length) {
            return '<span class="text-muted fst-italic fs-8">Belum ada pembayaran terverifikasi</span>';
        }

        var html = '<div style="min-width:180px;max-height:150px;overflow-y:auto">';

        p.history_pembayaran.forEach(function (h) {
            // Tentukan ikon badge berdasarkan jenis pembayaran
            var jenisBadge = '';
            if (h.jenis === 'Retur') {
                jenisBadge = '<span class="badge badge-light-danger" style="font-size:0.7rem">'
                    + '<i class="bi bi-arrow-return-left me-1"></i>Retur</span>';
            } else if (h.jenis === 'Transfer') {
                jenisBadge = '<span class="badge badge-light-info" style="font-size:0.7rem">'
                    + '<i class="bi bi-bank me-1"></i>' + escHtml(h.jenis) + '</span>';
            } else {
                jenisBadge = '<span class="badge badge-light-info" style="font-size:0.7rem">'
                    + escHtml(h.jenis) + '</span>';
            }

            html += ''
                + '<div class="d-flex justify-content-between align-items-start'
                +      ' border-bottom py-1 gap-2">'
                + '  <div>'
                + '    <div class="fs-8 text-muted">'
                + '      <i class="bi bi-calendar3"></i> ' + h.tgl_bayar
                + '    </div>'
                + '    <div class="fs-8 fw-bold text-primary">'
                + '      <i class="bi bi-receipt"></i> ' + escHtml(h.no_bayar)
                + '    </div>'
                + '    ' + jenisBadge
                + '  </div>'
                + '  <span class="badge badge-light-success text-nowrap" style="font-size:0.75rem">'
                + '    +' + h.jumlah_formatted
                + '  </span>'
                + '</div>';
        });

        html += ''
            + '<div class="d-flex justify-content-between align-items-center pt-1 mt-1">'
            + '  <small class="fw-bold text-dark">'
            + '    <i class="bi bi-sigma"></i> Total:'
            + '  </small>'
            + '  <small class="fw-bold text-success">' + p.total_sudah_bayar_formatted + '</small>'
            + '</div>'
            + '</div>';

        return html;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Open Payment Modal
    // ─────────────────────────────────────────────────────────────────────────
    function openPaymentModal(customerId, customerName) {
        selectedCustomer    = { id: customerId, name: customerName };
        customerPiutangData = [];

        $('#payment-customer-name').text(customerName);
        $('#payment-customer-id').val(customerId);
        $('#allocation-preview').html(
            '<div class="text-center py-3">'
            + '<i class="bi bi-arrow-clockwise spin"></i> Memuat data piutang...'
            + '</div>'
        );
        $('#total_bayar').val('').prop('readonly', false);
        updateSummary(0, 0);

        // Reset semua field tambahan
        resetPaymentTypeFields();

        // Load piutang FIFO
        $.get(window.routeGetPiutang, { customer_id: customerId }, function (res) {
            if (res.success && res.data.length) {
                customerPiutangData = res.data;

                var totalSisa = res.data.reduce(function (sum, p) {
                    return sum + parseFloat(p.sisa_piutang);
                }, 0);

                $('#payment-piutang-count').text(res.data.length + ' faktur');
                $('#total-sisa-display').text('Rp ' + formatNumber(totalSisa));
                $('#summary-total-piutang').text('Rp ' + formatNumber(totalSisa));

                // Hidden inputs piutang_ids
                $('.piutang-id-input').remove();
                res.data.forEach(function (p) {
                    $('#payment-form').append(
                        '<input type="hidden" name="piutang_ids[]"'
                        + ' class="piutang-id-input" value="' + p.id + '">'
                    );
                });

                showAllocationPreview(0);
            } else {
                customerPiutangData = [];
                $('#allocation-preview').html(
                    '<div class="alert alert-warning">'
                    + '<i class="bi bi-info-circle"></i> Tidak ada piutang aktif untuk customer ini.'
                    + '</div>'
                );
            }
        });

        var modal = new bootstrap.Modal(document.getElementById('paymentModal'));
        modal.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reset semua payment type fields
    // ─────────────────────────────────────────────────────────────────────────
    function resetPaymentTypeFields() {
        $('#bank-selection').hide();
        $('#giro-fields').hide();
        $('#retur-fields').hide();

        // Tampilkan kembali bukti pembayaran
        $('#bukti-section').show();
        $('#bukti_transfer').prop('required', false);

        // Reset Retur state
        $('#no_retur_select').empty().append('<option value="">-- Pilih No. Retur --</option>').hide();
        $('#retur-loading').hide();
        $('#retur-empty').hide();
        $('#retur-info').hide();
        $('#no_retur').val('');

        // Aktifkan kembali field jumlah bayar
        $('#total_bayar').prop('readonly', false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Load retur by customer
    // ─────────────────────────────────────────────────────────────────────────
    function loadReturByCustomer() {
        if (!selectedCustomer) {
            Swal.fire({
                icon:  'warning',
                title: 'Perhatian',
                text:  'Pilih customer terlebih dahulu melalui tombol Bayar.'
            });
            return;
        }

        // Reset state retur
        $('#no_retur_select').empty().append('<option value="">-- Pilih No. Retur --</option>').hide();
        $('#retur-empty').hide();
        $('#retur-info').hide();
        $('#no_retur').val('');
        $('#total_bayar').val('').prop('readonly', false);

        // Tampilkan loading
        $('#retur-loading').show();
        $('#retur-fields').show();

        console.log(window.routeGetRetur);

        $.get(window.routeGetRetur, { customer_id: selectedCustomer.id }, function (res) {
            $('#retur-loading').hide();

            if (!res.success || !res.data || res.data.length === 0) {
                $('#retur-empty').show();
                return;
            }

            // Isi select dengan data retur
            res.data.forEach(function (r) {
                $('#no_retur_select').append(
                    '<option value="' + escHtml(r.no_retur) + '"'
                    + ' data-netto="'   + r.netto            + '"'
                    + ' data-tgl="'     + escHtml(r.tgl_terima)   + '"'
                    + ' data-faktur="'  + escHtml(r.no_faktur)    + '"'
                    + ' data-alasan="'  + escHtml(r.alasan || '-') + '">'
                    + r.no_retur + '  —  ' + r.netto_formatted + '  (' + r.tgl_terima + ')'
                    + '</option>'
                );
            });

            // Init / reinit select2
            if ($('#no_retur_select').data('select2')) {
                $('#no_retur_select').select2('destroy');
            }
            $('#no_retur_select').select2({
                dropdownParent: $('#paymentModal'),
                placeholder:    '-- Pilih No. Retur --',
                allowClear:     true,
                width:          '100%'
            }).show();

        }).fail(function () {
            $('#retur-loading').hide();
            $('#retur-empty').show();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Allocation Preview (FIFO) — termasuk sisa sudah dibayar sebelumnya
    // ─────────────────────────────────────────────────────────────────────────
    function showAllocationPreview(jumlahBayar) {
        if (!customerPiutangData.length) return;

        var sisaBayar = parseFloat(jumlahBayar) || 0;

        if (sisaBayar <= 0) {
            $('#allocation-preview').html(
                '<div class="alert alert-warning">'
                + '<i class="bi bi-info-circle"></i> '
                + 'Masukkan jumlah pembayaran untuk melihat alokasi otomatis (FIFO berdasarkan tanggal faktur).'
                + '</div>'
            );
            return;
        }

        var html = '<div class="table-responsive">'
            + '<table class="table table-sm table-bordered">'
            + '<thead class="table-light"><tr>'
            + '<th>#</th>'
            + '<th>No. Penjualan</th>'
            + '<th>No. Piutang</th>'
            + '<th class="text-center">Tgl Faktur</th>'
            + '<th class="text-end">Netto Asal</th>'
            + '<th class="text-end text-success">Sudah Dibayar</th>'
            + '<th class="text-end text-warning">Sisa Saat Ini</th>'
            + '<th class="text-end text-primary">Dibayar Kali Ini</th>'
            + '<th class="text-end">Sisa Setelah</th>'
            + '<th class="text-center">Status</th>'
            + '</tr></thead><tbody>';

        var tempSisa = sisaBayar;

        customerPiutangData.forEach(function (p, i) {
            var sisaSaatIni    = parseFloat(p.sisa_piutang);
            var sudahDibayar   = parseFloat(p.total_sudah_bayar || 0);
            var nettoAsal      = parseFloat(p.netto || 0);
            var dibayarKaliIni = 0;
            var sisaSetelah    = sisaSaatIni;
            var statusHtml     = '<span class="badge badge-secondary">Tidak Terpengaruh</span>';
            var rowClass       = '';

            if (sisaSaatIni > 0 && tempSisa > 0) {
                dibayarKaliIni = Math.min(tempSisa, sisaSaatIni);
                sisaSetelah    = sisaSaatIni - dibayarKaliIni;
                tempSisa      -= dibayarKaliIni;
                statusHtml     = sisaSetelah <= 0
                    ? '<span class="badge badge-success"><i class="bi bi-check-circle"></i> LUNAS</span>'
                    : '<span class="badge badge-warning"><i class="bi bi-hourglass-split"></i> SEBAGIAN</span>';
                rowClass = sisaSetelah <= 0 ? 'table-success' : 'table-warning';
            }

            html += '<tr class="' + rowClass + '">'
                + '<td>' + (i + 1) + '</td>'
                + '<td><code>' + escHtml(p.no_penjualan || '-') + '</code></td>'
                + '<td><code>' + escHtml(p.no_piutang) + '</code></td>'
                + '<td class="text-center">' + (p.tgl_faktur || '-') + '</td>'
                + '<td class="text-end text-muted">'
                +   (nettoAsal > 0 ? 'Rp ' + formatNumber(nettoAsal) : '-')
                + '</td>'
                + '<td class="text-end text-success fw-bold">'
                +   (sudahDibayar > 0
                        ? '<i class="bi bi-check-circle-fill"></i> Rp ' + formatNumber(sudahDibayar)
                        : '<span class="text-muted">-</span>')
                + '</td>'
                + '<td class="text-end fw-bold ' + (sisaSaatIni <= 0 ? 'text-success' : 'text-danger') + '">'
                +   (sisaSaatIni <= 0 ? 'LUNAS' : 'Rp ' + formatNumber(sisaSaatIni))
                + '</td>'
                + '<td class="text-end fw-bold text-primary">'
                +   (dibayarKaliIni > 0 ? 'Rp ' + formatNumber(dibayarKaliIni) : '-')
                + '</td>'
                + '<td class="text-end">'
                +   (dibayarKaliIni > 0
                        ? 'Rp ' + formatNumber(sisaSetelah)
                        : '<span class="text-muted">' + p.sisa_piutang_formatted + '</span>')
                + '</td>'
                + '<td class="text-center">' + statusHtml + '</td>'
                + '</tr>';
        });

        // Kelebihan bayar
        if (tempSisa > 0) {
            html += '<tr class="table-info">'
                + '<td colspan="7" class="text-end fw-bold">Kelebihan Bayar:</td>'
                + '<td class="text-end fw-bold text-info" colspan="3">'
                +   'Rp ' + formatNumber(tempSisa)
                + '</td>'
                + '</tr>';
        }

        html += '</tbody></table></div>'
            + '<small class="text-muted mt-1 d-block">'
            + '<i class="bi bi-info-circle"></i> '
            + 'Urutan FIFO berdasarkan tanggal faktur penjualan. '
            + '<span class="text-success fw-bold">Sudah Dibayar</span> = '
            + 'pembayaran yang sudah terverifikasi (status POSTING).'
            + '</small>';

        $('#allocation-preview').html(html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Update Summary
    // ─────────────────────────────────────────────────────────────────────────
    function updateSummary(totalPiutang, jumlahBayar) {
        var sisa = totalPiutang - jumlahBayar;
        $('#summary-total-piutang').text('Rp ' + formatNumber(totalPiutang));
        $('#summary-jumlah-bayar').text('Rp ' + formatNumber(jumlahBayar));
        $('#summary-sisa').text('Rp ' + formatNumber(Math.max(0, sisa)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    function formatNumber(num) {
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function parseFormattedNumber(str) {
        return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Init all event listeners
    // ─────────────────────────────────────────────────────────────────────────
    function initEvents() {
        // ── Filter ────────────────────────────────────────────────────────
        $('#btn-filter').on('click', function () { table.ajax.reload(); });
        $('#btn-reset').on('click', function () {
            $('#filter-form')[0].reset();
            $('#customer_id').val('').trigger('change');
            table.ajax.reload();
        });

        // ── Payment type card ─────────────────────────────────────────────
        $(document).on('click', '.payment-type-card', function () {
            // Abaikan jika disabled
            if ($(this).css('cursor') === 'not-allowed') return;

            $('.payment-type-card').removeClass('active');
            $(this).addClass('active');
            var type = $(this).data('type');
            $('#jenis_pembayaran').val(type);

            // Sembunyikan semua field tambahan
            $('#bank-selection').hide();
            $('#giro-fields').hide();
            $('#retur-fields').hide();

            // Reset Retur state saat ganti jenis
            $('#no_retur').val('');
            $('#retur-info').hide();
            $('#total_bayar').prop('readonly', false);

            $('#bukti-section').show();
            $('#bukti_transfer').prop('required', false);

            if (type === 'Transfer') {
                $('#bank-selection').show();
                if ($('#bank_account_id').data('select2')) {
                    $('#bank_account_id').select2('destroy');
                }
                $('#bank_account_id').select2({
                    dropdownParent: $('#paymentModal'),
                    placeholder:    'Pilih Rekening Bank',
                    allowClear:     true,
                    width:          '100%'
                });

            } else if (type === 'Giro') {
                $('#giro-fields').show();

                if ($('#bank_account_id_giro').data('select2')) {
                    $('#bank_account_id_giro').select2('destroy');
                }
                $('#bank_account_id_giro').select2({
                    dropdownParent: $('#paymentModal'),
                    placeholder:    'Pilih Rekening Tujuan',
                    allowClear:     true,
                    width:          '100%'
                });

                if ($('#nama_giro_select').data('select2')) {
                    $('#nama_giro_select').select2('destroy');
                }

                if ($('#nama_giro_select option').length <= 1) {
                    BANK_INDONESIA.forEach(function (bankName) {
                        $('#nama_giro_select').append(
                            '<option value="' + bankName + '">' + bankName + '</option>'
                        );
                    });
                }

                $('#nama_giro_select').select2({
                    dropdownParent: $('#paymentModal'),
                    placeholder:    'Pilih / Ketik Nama Bank Penerbit',
                    allowClear:     true,
                    width:          '100%',
                    tags:           true,
                    language: {
                        noResults: function () { return 'Bank tidak ditemukan, ketik untuk tambah baru'; }
                    }
                });

            } else if (type === 'Retur') {
                // Sembunyikan bukti pembayaran
                $('#bukti-section').hide();
                $('#bukti_transfer').prop('required', false);
                // Load retur aktif milik customer ini
                loadReturByCustomer();
            }
        });

        // ── No Retur select — onChange ────────────────────────────────────
        $(document).on('change', '#no_retur_select', function () {
            var selected = $(this).find(':selected');
            var noRetur  = $(this).val();
            var netto    = parseFloat(selected.data('netto')) || 0;
            var tgl      = selected.data('tgl')    || '-';
            var faktur   = selected.data('faktur') || '-';

            if (!noRetur) {
                $('#retur-info').hide();
                $('#no_retur').val('');
                $('#total_bayar').val('').prop('readonly', false).data('raw', 0);
                updateSummary(0, 0);
                showAllocationPreview(0);
                return;
            }

            // Isi hidden input
            $('#no_retur').val(noRetur);

            // Tampilkan info retur
            $('#retur-no-display').text(noRetur);
            $('#retur-tgl-display').text(tgl);
            $('#retur-faktur-display').text(faktur);
            $('#retur-netto-display').text('Rp ' + formatNumber(netto));
            $('#retur-info').show();

            // Auto-isi & kunci jumlah bayar = netto retur
            $('#total_bayar')
                .val(formatNumber(netto))
                .data('raw', netto)
                .prop('readonly', true);

            // Update summary & alokasi preview
            var totalPiutang = customerPiutangData.reduce(function (s, p) {
                return s + parseFloat(p.sisa_piutang);
            }, 0);
            updateSummary(totalPiutang, netto);
            showAllocationPreview(netto);
        });

        // ── Total bayar input ─────────────────────────────────────────────
        $('#total_bayar').on('input', function () {
            // Jika Retur, tidak boleh diubah manual
            if ($('#jenis_pembayaran').val() === 'Retur') return;

            var raw         = $(this).val().replace(/[^0-9]/g, '');
            var jumlahBayar = parseFloat(raw) || 0;

            if (raw) $(this).val(formatNumber(raw));

            var totalPiutang = customerPiutangData.reduce(function (s, p) {
                return s + parseFloat(p.sisa_piutang);
            }, 0);

            updateSummary(totalPiutang, jumlahBayar);
            showAllocationPreview(jumlahBayar);
            $(this).data('raw', jumlahBayar);
        });

        // ── Submit form ───────────────────────────────────────────────────
        $('#payment-form').on('submit', function (e) {
            e.preventDefault();

            // Validasi tambahan untuk Retur
            var jenis = $('#jenis_pembayaran').val();
            if (jenis === 'Retur' && !$('#no_retur').val()) {
                Swal.fire({
                    icon:  'warning',
                    title: 'Pilih No. Retur',
                    text:  'Silakan pilih nomor retur terlebih dahulu.'
                });
                return;
            }

            // Fix total_bayar
            var rawVal = $('#total_bayar').data('raw')
                || parseFormattedNumber($('#total_bayar').val());
            $('input[name="total_bayar"]').remove();
            $(this).append(
                '<input type="hidden" name="total_bayar" value="' + rawVal + '">'
            );

            // Fix bank_account_id — inject sesuai jenis pembayaran
            $('input[name="bank_account_id"]').remove();
            if (jenis === 'Transfer') {
                var bankId = $('#bank_account_id').val();
                $(this).append(
                    '<input type="hidden" name="bank_account_id" value="' + bankId + '">'
                );
            } else if (jenis === 'Giro') {
                var bankIdGiro = $('#bank_account_id_giro').val();
                $(this).append(
                    '<input type="hidden" name="bank_account_id" value="' + bankIdGiro + '">'
                );
            }

            submitPayment();
        });

        // ── Image preview ─────────────────────────────────────────────────
        $('#bukti_transfer').on('change', function () {
            var file = this.files[0];
            if (file && file.type.startsWith('image/')) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $('#image-preview').attr('src', e.target.result).show();
                };
                reader.readAsDataURL(file);
            } else {
                $('#image-preview').hide();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Submit payment
    // ─────────────────────────────────────────────────────────────────────────
    function submitPayment() {
        var btn = $('#btn-submit-payment');
        btn.prop('disabled', true)
           .html('<i class="bi bi-arrow-clockwise spin"></i> Menyimpan...');

        var formData = new FormData($('#payment-form')[0]);

        $.ajax({
            url:         window.routeStore,
            method:      'POST',
            data:        formData,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res.success) {
                    Swal.fire({
                        icon:              'success',
                        title:             'Berhasil!',
                        text:              res.message,
                        confirmButtonText: 'OK'
                    }).then(function () {
                        bootstrap.Modal
                            .getInstance(document.getElementById('paymentModal'))
                            .hide();
                        table.ajax.reload();
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                }
            },
            error: function (xhr) {
                var msg = 'Terjadi kesalahan server';
                if (xhr.responseJSON) {
                    if (xhr.responseJSON.errors) {
                        var errList = Object.values(xhr.responseJSON.errors).flat();
                        msg = errList.join('\n');
                    } else if (xhr.responseJSON.message) {
                        msg = xhr.responseJSON.message;
                    }
                }
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            },
            complete: function () {
                btn.prop('disabled', false)
                   .html('<i class="bi bi-check-circle"></i> Submit Pembayaran');
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Init Select2
    // ─────────────────────────────────────────────────────────────────────────
    function initSelect2() {
        $('#customer_id').select2({
            placeholder: 'Semua Customer',
            allowClear:  true,
            width:       '100%'
        });

        $('#paymentModal').on('shown.bs.modal', function () {
            if ($('#bank_account_id').data('select2')) {
                $('#bank_account_id').select2('destroy');
            }
            $('#bank_account_id').select2({
                dropdownParent: $('#paymentModal'),
                placeholder:    'Pilih Rekening Bank',
                allowClear:     true,
                width:          '100%'
            });

            if ($('#bank_account_id_giro').data('select2')) {
                $('#bank_account_id_giro').select2('destroy');
            }
            $('#bank_account_id_giro').select2({
                dropdownParent: $('#paymentModal'),
                placeholder:    'Pilih Rekening Tujuan',
                allowClear:     true,
                width:          '100%'
            });
        });

        // Reset semua field ketika modal ditutup
        $('#paymentModal').on('hidden.bs.modal', function () {
            resetPaymentTypeFields();
            $('.payment-type-card').removeClass('active');
            $('.payment-type-card[data-type="Tunai"]').addClass('active');
            $('#jenis_pembayaran').val('Tunai');
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Overview Cards
    // ─────────────────────────────────────────────────────────────────────────
    function loadOverview() {
        var bulan = $('#overview-bulan').val();
        var tahun = $('#overview-tahun').val();

        ['posted-nominal','belum-posting-nominal'].forEach(function(id) {
            $('#' + id).html('<div class="skeleton-loader w-75"></div>');
        });
        ['posted-transaksi','belum-posting-transaksi'].forEach(function(id) {
            $('#' + id).html('<span class="skeleton-loader d-inline-block" style="width:60px"></span>');
        });
        ['posted-breakdown','belum-posting-breakdown'].forEach(function(id) {
            $('#' + id).html(
                '<div class="skeleton-loader mb-2"></div>'
                + '<div class="skeleton-loader mb-2" style="height:14px;width:80%"></div>'
                + '<div class="skeleton-loader" style="height:14px;width:60%"></div>'
            );
        });

        $.get(window.routeOverview, { bulan: bulan, tahun: tahun }, function(res) {
            if (!res.success) return;

            $('#overview-periode-label').text('Periode: 1 — akhir ' + res.periode);

            $('#posted-nominal').text(res.posted.total_formatted);
            $('#posted-transaksi').text(res.posted.jumlah_transaksi);
            $('#posted-breakdown').html(buildBreakdownHtml(res.posted.breakdown, 'success'));

            $('#belum-posting-nominal').text(res.belum_posting.total_formatted);
            $('#belum-posting-transaksi').text(res.belum_posting.jumlah_transaksi);
            $('#belum-posting-breakdown').html(buildBreakdownHtml(res.belum_posting.breakdown, 'warning'));

        }).fail(function() {
            $('#overview-periode-label').text('Gagal memuat data overview');
        });
    }

    function buildBreakdownHtml(breakdown, colorClass) {
        var items = [
            { label: '<i class="bi bi-cash me-1"></i>Tunai',           value: breakdown.tunai    },
            { label: '<i class="bi bi-bank me-1"></i>Transfer',         value: breakdown.transfer },
            { label: '<i class="bi bi-journal-check me-1"></i>Giro',    value: breakdown.giro     },
            { label: '<i class="bi bi-file-text me-1"></i>Credit Memo', value: breakdown.cm       },
            { label: '<i class="bi bi-file-earmark-text me-1"></i>Credit Note', value: breakdown.cn },
            { label: '<i class="bi bi-arrow-return-left me-1"></i>Retur', value: breakdown.retur  },
        ];

        var activeItems = items.filter(function(i) { return parseFloat(i.value) > 0; });

        if (!activeItems.length) {
            return '<div class="text-muted fst-italic fs-8">'
                + '<i class="bi bi-inbox me-1"></i>Tidak ada transaksi pada periode ini'
                + '</div>';
        }

        var html = '';
        activeItems.forEach(function(item) {
            html += '<div class="breakdown-item">'
                + '  <span class="text-muted">' + item.label + '</span>'
                + '  <span class="fw-bold text-' + colorClass + '">'
                +      'Rp ' + formatNumber(item.value)
                + '  </span>'
                + '</div>';
        });
        return html;
    }

    function initOverview() {
        loadOverview();

        $('#overview-bulan, #overview-tahun').on('change', function() {
            loadOverview();
        });

        $('#btn-refresh-overview').on('click', function() {
            var icon = $(this).find('i');
            icon.addClass('spin');
            loadOverview();
            setTimeout(function() { icon.removeClass('spin'); }, 800);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public
    // ─────────────────────────────────────────────────────────────────────────
    return {
        init: function () {
            initTable();
            initEvents();
            initSelect2();
            initOverview();
        }
    };
})();

$(document).ready(function () {
    PembayaranPiutang.init();
});