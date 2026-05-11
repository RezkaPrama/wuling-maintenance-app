$(document).ready(function () {
    let currentReturData = null;

    // Initialize Select2 for No Retur
    $('#no_retur').select2({
        ajax: {
            url: getReturListUrl,
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term,
                    page: params.page || 1
                };
            },
            processResults: function (data) {
                return {
                    results: data.results,
                    pagination: data.pagination
                };
            },
            cache: true
        },
        placeholder: 'Ketik untuk mencari nomor retur...',
        minimumInputLength: 0,
        allowClear: true
    });

    // Enable/Disable Load Detail button
    $('#no_retur').on('change', function () {
        const hasValue = $(this).val() !== '';
        $('#btn-load-detail').prop('disabled', !hasValue);

        if (!hasValue) {
            resetForm();
        }
    });

    // Load Detail Button Click
    $('#btn-load-detail').on('click', function () {
        const noRetur = $('#no_retur').val();

        if (!noRetur) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Pilih nomor retur terlebih dahulu!'
            });
            return;
        }

        // console.log(noRetur);
        
        loadReturDetail(noRetur);
    });

    // Load Retur Detail
    function loadReturDetail(noRetur) {
        Swal.fire({
            title: 'Memuat Data...',
            text: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Gunakan query parameter
        $.ajax({
            url: getReturDetailUrl,
            type: 'GET',
            data: {
                no_retur: noRetur
            },
            success: function (response) {
                console.log(response);
                
                if (response.success) {
                    currentReturData = response.data;
                    displayHeaderInfo(response.data.header);
                    displayDetailTable(response.data.details);

                    $('#header-section').slideDown();
                    $('#detail-section').slideDown();

                    Swal.close();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: response.message || 'Gagal memuat data'
                    });
                }
            },
            error: function (xhr) {
                let errorMessage = 'Terjadi kesalahan saat memuat data';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        });
    }

    // Display Header Information
    function displayHeaderInfo(header) {
        $('#info_no_retur').text(header.no_retur || '-');
        $('#info_tgl_terima').text(formatDate(header.tgl_terima) || '-');
        $('#info_periode').text(header.periode || '-');
        $('#info_no_faktur').text(header.no_faktur || '-');
        $('#info_j_transaksi').text(header.j_transaksi || '-');
        $('#info_sales').text(header.nama_employee || '-');
        $('#info_id_cust').text(header.id_cust || '-');
        $('#info_nama_customer').text(header.nama_customer || '-');
        $('#info_telepon').text(header.telepon_customer || '-');
        $('#info_alamat').text(header.alamat_customer || '-');
        $('#info_kelurahan').text(header.kelurahan || '-');
        $('#info_kecamatan').text(header.kecamatan || '-');
        $('#info_provinsi').text(header.provinsi || '-');
        $('#info_alasan').text(header.alasan || '-');
    }

    // Display Detail Table with BS column
    function displayDetailTable(details) {
        const tbody = $('#detail-tbody');
        tbody.empty();

        if (!details || details.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="7" class="text-center">Tidak ada data detail</td>
                </tr>
            `);
            return;
        }

        details.forEach((item, index) => {
            const row = `
                <tr data-kode-bar="${item.kode_bar}">
                    <td class="text-center">${index + 1}</td>
                    <td>${item.kode_bar || '-'}</td>                    
                    <td class="text-center pasang-sistem">${formatNumber(item.pasang)}</td>
                    <td class="text-center">
                        <input type="number" 
                            class="form-control form-control-sm input-bs text-center" 
                            data-kode-bar="${item.kode_bar}"
                            data-pasang-sistem="${item.pasang}"
                            value="0"
                            min="0"
                            max="${item.pasang}"
                            style="max-width: 100px;">
                    </td>
                    <td class="text-center">
                        <input type="number" 
                            class="form-control form-control-sm input-fisik text-center" 
                            data-kode-bar="${item.kode_bar}"
                            data-pasang-sistem="${item.pasang}"
                            data-pasang-original="${item.pasang}"
                            value="${item.pasang}"
                            min="0"
                            style="max-width: 100px;">
                    </td>
                    <td class="text-center selisih-cell">
                        <span class="badge badge-selisih selisih-zero">0</span>
                    </td>
                    <td>
                        <input type="text" 
                            class="form-control form-control-sm input-keterangan" 
                            data-kode-bar="${item.kode_bar}"
                            placeholder="Keterangan...">
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        calculateTotals();
    }

    // Calculate BS effect on Pasang Fisik
    $(document).on('input', '.input-bs', function () {
        const $row = $(this).closest('tr');
        const pasangOriginal = parseInt($(this).data('pasang-sistem')) || 0;
        const bs = parseInt($(this).val()) || 0;
        
        // Validasi BS tidak boleh lebih besar dari pasang sistem
        if (bs > pasangOriginal) {
            $(this).val(pasangOriginal);
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Jumlah BS tidak boleh lebih besar dari Pasang Sistem!',
                timer: 2000,
                showConfirmButton: false
            });
            return;
        }
        
        // Hitung Pasang Fisik = Pasang Sistem - BS
        const pasangFisik = pasangOriginal - bs;
        
        // Update input fisik
        const $inputFisik = $row.find('.input-fisik');
        $inputFisik.val(pasangFisik);
        $inputFisik.data('pasang-sistem', pasangOriginal);
        
        // Trigger perhitungan selisih
        calculateSelisihForRow($row);
        calculateTotals();
    });

    // Handle manual edit Pasang Fisik
    $(document).on('input', '.input-fisik', function () {
        const $row = $(this).closest('tr');
        calculateSelisihForRow($row);
        calculateTotals();
    });

    // Calculate Selisih for specific row
    function calculateSelisihForRow($row) {
        const pasangSistem = parseInt($row.find('.input-fisik').data('pasang-sistem')) || 0;
        const pasangFisik = parseInt($row.find('.input-fisik').val()) || 0;
        const selisih = pasangFisik - pasangSistem;

        const selisihCell = $row.find('.selisih-cell span');
        selisihCell.text(selisih);

        // Update badge class based on selisih
        selisihCell.removeClass('selisih-positive selisih-negative selisih-zero badge-success badge-danger badge-secondary');

        if (selisih > 0) {
            selisihCell.addClass('selisih-positive badge-success');
        } else if (selisih < 0) {
            selisihCell.addClass('selisih-negative badge-danger');
        } else {
            selisihCell.addClass('selisih-zero badge-secondary');
        }
    }

    // Calculate Totals
    function calculateTotals() {
        let totalSistem = 0;
        let totalBs = 0;
        let totalFisik = 0;

        $('#detail-tbody tr').each(function() {
            const pasangSistem = parseInt($(this).find('.input-fisik').data('pasang-sistem')) || 0;
            const bs = parseInt($(this).find('.input-bs').val()) || 0;
            const pasangFisik = parseInt($(this).find('.input-fisik').val()) || 0;

            totalSistem += pasangSistem;
            totalBs += bs;
            totalFisik += pasangFisik;
        });

        const totalSelisih = totalFisik - totalSistem;

        $('#total-sistem').text(formatNumber(totalSistem));
        $('#total-bs').text(formatNumber(totalBs));
        $('#total-fisik').text(formatNumber(totalFisik));

        const selisihText = totalSelisih > 0 ? '+' + formatNumber(totalSelisih) : formatNumber(totalSelisih);
        $('#total-selisih').text(selisihText);

        // Apply color to total selisih
        const totalSelisihCell = $('#total-selisih');
        totalSelisihCell.removeClass('selisih-positive selisih-negative selisih-zero');

        if (totalSelisih > 0) {
            totalSelisihCell.addClass('selisih-positive');
        } else if (totalSelisih < 0) {
            totalSelisihCell.addClass('selisih-negative');
        } else {
            totalSelisihCell.addClass('selisih-zero');
        }
    }

    // Update Submit Form to include BS and Keterangan
    $('#verifikasi-retur-form').on('submit', function (e) {
        e.preventDefault();

        const noRetur = $('#no_retur').val();

        if (!noRetur) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Pilih nomor retur terlebih dahulu!'
            });
            return;
        }

        // Collect verification details with BS and Keterangan
        const verifikasiDetails = [];
        let hasError = false;

        $('#detail-tbody tr').each(function() {
            const $row = $(this);
            const kodebar = $row.data('kode-bar');
            
            if (!kodebar) return; // Skip empty rows
            
            const pasangSistem = parseInt($row.find('.input-fisik').data('pasang-sistem')) || 0;
            const bs = parseInt($row.find('.input-bs').val()) || 0;
            const pasangFisik = parseInt($row.find('.input-fisik').val()) || 0;
            const keterangan = $row.find('.input-keterangan').val() || '';

            // Validasi
            if (bs > pasangSistem) {
                hasError = true;
                Swal.fire({
                    icon: 'warning',
                    title: 'Perhatian',
                    text: `BS pada artikel ${kodebar} tidak boleh lebih besar dari Pasang Sistem!`
                });
                return false;
            }

            verifikasiDetails.push({
                kode_bar: kodebar,
                pasang_sistem: pasangSistem,
                bs: bs,
                pasang_fisik: pasangFisik,
                keterangan: keterangan
            });
        });

        if (hasError) {
            return;
        }

        if (verifikasiDetails.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Tidak ada data untuk disimpan!'
            });
            return;
        }

        // Confirm before submit
        Swal.fire({
            title: 'Konfirmasi Verifikasi',
            html: `
                <p>Apakah Anda yakin data verifikasi sudah benar?</p>
                <div class="mt-3 text-start">
                    <strong>Total Sistem:</strong> ${$('#total-sistem').text()}<br>
                    <strong>Total BS:</strong> ${$('#total-bs').text()}<br>
                    <strong>Total Fisik:</strong> ${$('#total-fisik').text()}<br>
                    <strong>Total Selisih:</strong> ${$('#total-selisih').text()}
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                submitVerification(noRetur, verifikasiDetails);
            }
        });
    });

    // Submit Verification to Server
    function submitVerification(noRetur, verifikasiDetails) {
        Swal.fire({
            title: 'Menyimpan...',
            text: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: storeVerifikasiUrl,
            type: 'POST',
            data: {
                _token: $('input[name="_token"]').val(),
                no_retur: noRetur,
                catatan_verifikasi: $('#catatan_verifikasi').val(),
                verifikasi_details: verifikasiDetails
            },
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: response.message || 'Verifikasi berhasil disimpan',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        resetForm();
                        $('#no_retur').val(null).trigger('change');
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: response.message || 'Gagal menyimpan verifikasi'
                    });
                }
            },
            error: function (xhr) {
                let errorMessage = 'Terjadi kesalahan saat menyimpan data';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        });
    }

    // Utility function
    function formatNumber(num) {
        if (isNaN(num)) return '0';
        return parseInt(num).toLocaleString('id-ID');
    }

    // Reset Button
    $('#btn-reset').on('click', function () {
        Swal.fire({
            title: 'Reset Form?',
            text: 'Semua perubahan akan dikembalikan ke nilai awal',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Reset',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                if (currentReturData) {
                    displayDetailTable(currentReturData.details);
                }
                $('#catatan_verifikasi').val('');
            }
        });
    });

    // Reset Form Function
    function resetForm() {
        currentReturData = null;
        $('#header-section').slideUp();
        $('#detail-section').slideUp();
        $('#detail-tbody').empty();
        $('#catatan_verifikasi').val('');

        // Reset info fields
        $('#info_no_retur, #info_tgl_terima, #info_periode, #info_no_faktur, #info_j_transaksi, #info_sales, #info_id_cust, #info_nama_customer, #info_telepon, #info_alamat, #info_kelurahan, #info_kecamatan, #info_provinsi, #info_alasan').text('-');

        // Reset totals
        $('#total-sistem, #total-fisik, #total-selisih').text('0');
    }

    // Utility Functions
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatNumber(num) {
        if (isNaN(num)) return '0';
        return parseInt(num).toLocaleString('id-ID');
    }

    // Tambahkan di bagian bawah index.js existing

    // ============================================
    // MANUAL SCAN FUNCTIONALITY
    // ============================================

    let scannedItems = [];
    let scanCounter = 0;
    let selectedCustomer = null;
    let selectedEmployee = null;

    // Initialize Select2 for Customer
    $('#id_cust_manual').select2({
        ajax: {
            url: "{{ route('verifikasi-retur.customers') }}",
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term,
                    page: params.page || 1
                };
            },
            processResults: function (data) {
                return {
                    results: data.results,
                    pagination: data.pagination
                };
            },
            cache: true
        },
        placeholder: 'Ketik ID atau Nama Customer...',
        minimumInputLength: 0,
        allowClear: true,
        width: '100%'
    });

    // Initialize Select2 for Employee
    $('#idemployee_manual').select2({
        ajax: {
            url: "{{ route('verifikasi-retur.employees') }}",
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term,
                    page: params.page || 1
                };
            },
            processResults: function (data) {
                return {
                    results: data.results,
                    pagination: data.pagination
                };
            },
            cache: true
        },
        placeholder: 'Ketik ID atau Nama Employee...',
        minimumInputLength: 0,
        allowClear: true,
        width: '100%'
    });

    // Customer Selection Handler - Get Full Data
    $('#id_cust_manual').on('select2:select', function (e) {
        const customerId = e.params.data.id;

        // Fetch customer detail
        $.ajax({
            url: "{{ route('verifikasi-retur.customers') }}",
            data: { q: customerId },
            success: function (response) {
                if (response.results && response.results.length > 0) {
                    const customer = response.results[0];
                    selectedCustomer = customer;

                    // Extract info from text (format: ID - Nama (Kecamatan))
                    const text = customer.text;
                    const parts = text.split(' - ');

                    if (parts.length > 1) {
                        const namePart = parts[1];
                        const addressMatch = namePart.match(/\(([^)]+)\)/);

                        $('#cust-alamat').text(addressMatch ? addressMatch[1] : '-');
                        $('#cust-telepon').text('-');
                    }

                    $('#customer-info').slideDown();
                }
            }
        });
    });

    $('#id_cust_manual').on('select2:clear', function () {
        selectedCustomer = null;
        $('#customer-info').slideUp();
    });

    // Employee Selection Handler - Get Full Data
    $('#idemployee_manual').on('select2:select', function (e) {
        const employeeId = e.params.data.id;

        // Fetch employee detail
        $.ajax({
            url: "{{ route('verifikasi-retur.employees') }}",
            data: { q: employeeId },
            success: function (response) {
                if (response.results && response.results.length > 0) {
                    const employee = response.results[0];
                    selectedEmployee = employee;

                    // Extract info from text (format: ID - Nama (Cab: XXX))
                    const text = employee.text;
                    const cabMatch = text.match(/\(Cab: ([^)]+)\)/);

                    $('#emp-id').text(employeeId);
                    $('#emp-cabang').text(cabMatch ? cabMatch[1] : '-');

                    $('#employee-info').slideDown();
                }
            }
        });
    });

    $('#idemployee_manual').on('select2:clear', function () {
        selectedEmployee = null;
        $('#employee-info').slideUp();
    });

    // Barcode Input Handler
    $('#barcode_input').on('keypress', function (e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            const barcode = $(this).val().trim();

            if (barcode) {
                searchProductByBarcode(barcode);
            }
        }
    });

    // Pasang Input Handler
    $('#pasang_input').on('keypress', function (e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            $('#barcode_input').focus();
        }
    });

    // Search Product by Barcode
    function searchProductByBarcode(barcode) {
        const getProductUrl = "{{ route('verifikasi-retur.product', ['barcode' => ':barcode']) }}";
        const url = getProductUrl.replace(':barcode', encodeURIComponent(barcode));

        // Show loading
        Swal.fire({
            title: 'Mencari Produk...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                Swal.close();

                if (response.success) {
                    addScannedItem(response.data);
                    $('#barcode_input').val('').focus();
                }
            },
            error: function (xhr) {
                let errorMessage = 'Produk tidak ditemukan';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    timer: 2000,
                    showConfirmButton: false
                });

                $('#barcode_input').val('').focus();
            }
        });
    }

    // Add Scanned Item to Table
    function addScannedItem(product) {
        const pasang = parseInt($('#pasang_input').val()) || 1;

        // Check if already scanned
        const existingIndex = scannedItems.findIndex(item => item.kode_bar === product.kode_bar);

        if (existingIndex >= 0) {
            // Update quantity
            scannedItems[existingIndex].pasang += pasang;
            updateScannedItemRow(existingIndex);

            // Show notification
            showToast('success', `Jumlah ${product.nama_product} ditambahkan`);
        } else {
            // Add new item
            scanCounter++;
            scannedItems.push({
                no: scanCounter,
                kode_bar: product.kode_bar,
                nama_product: product.nama_product || '-',
                art: product.art || '-',
                color: product.color || '-',
                size: product.size || '-',
                pasang: pasang
            });

            renderScannedItems();

            // Show notification
            showToast('success', `${product.nama_product} ditambahkan`);
        }

        // Reset pasang input
        $('#pasang_input').val(1);
    }

    // Render Scanned Items Table
    function renderScannedItems() {
        const tbody = $('#scanned-items-tbody');
        tbody.empty();

        if (scannedItems.length === 0) {
            tbody.append(`
            <tr id="empty-scan-row">
                <td colspan="8" class="text-center text-muted">
                    Belum ada item yang discan
                </td>
            </tr>
        `);
            $('#total-pasang-manual').text('0');
            return;
        }

        let totalPasang = 0;

        scannedItems.forEach((item, index) => {
            totalPasang += item.pasang;

            const row = `
            <tr data-index="${index}">
                <td class="text-center">${index + 1}</td>
                <td>${item.kode_bar}</td>
                <td>${item.nama_product}</td>
                <td class="text-center">${item.art}</td>
                <td class="text-center">${item.color}</td>
                <td class="text-center">${item.size}</td>
                <td class="text-center">
                    <input type="number" 
                           class="form-control form-control-sm text-center scanned-pasang-input" 
                           data-index="${index}"
                           value="${item.pasang}"
                           min="1"
                           style="max-width: 100px; margin: 0 auto;">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-danger btn-delete-scan" data-index="${index}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
            tbody.append(row);
        });

        $('#total-pasang-manual').text(formatNumber(totalPasang));
    }

    // Update Scanned Item Row (when quantity changes)
    function updateScannedItemRow(index) {
        const row = $(`tr[data-index="${index}"]`);
        const pasangInput = row.find('.scanned-pasang-input');
        pasangInput.val(scannedItems[index].pasang);

        calculateManualTotals();
    }

    // Handle Pasang Input Change
    $(document).on('input', '.scanned-pasang-input', function () {
        const index = $(this).data('index');
        const newPasang = parseInt($(this).val()) || 1;

        scannedItems[index].pasang = newPasang;
        calculateManualTotals();
    });

    // Calculate Manual Totals
    function calculateManualTotals() {
        let totalPasang = 0;

        scannedItems.forEach(item => {
            totalPasang += item.pasang;
        });

        $('#total-pasang-manual').text(formatNumber(totalPasang));
    }

    // Delete Scanned Item
    $(document).on('click', '.btn-delete-scan', function () {
        const index = $(this).data('index');

        Swal.fire({
            title: 'Hapus Item?',
            text: 'Item ini akan dihapus dari daftar',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                scannedItems.splice(index, 1);
                renderScannedItems();
                showToast('success', 'Item berhasil dihapus');
            }
        });
    });

    // Reset Manual Form
    $('#btn-reset-manual').on('click', function () {
        Swal.fire({
            title: 'Reset Form Manual?',
            text: 'Semua data scan akan dihapus',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Reset',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                resetManualForm();
            }
        });
    });

    function resetManualForm() {
        scannedItems = [];
        scanCounter = 0;
        selectedCustomer = null;
        selectedEmployee = null;

        renderScannedItems();

        $('#no_retur_manual').val('');
        $('#tgl_terima_manual').val(getTodayDate());

        // Reset Select2
        $('#id_cust_manual').val(null).trigger('change');
        $('#idemployee_manual').val(null).trigger('change');

        $('#alasan_manual').val('');
        $('#catatan_manual').val('');
        $('#barcode_input').val('');
        $('#pasang_input').val(1);

        // Hide info boxes
        $('#customer-info').slideUp();
        $('#employee-info').slideUp();
    }

    // Helper function to get today's date in YYYY-MM-DD format
    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Submit Manual Form
    $('#manual-scan-form').on('submit', function (e) {
        e.preventDefault();

        // Validation
        if (scannedItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Belum ada item yang discan!'
            });
            return;
        }

        const noRetur = $('#no_retur_manual').val();
        const tglTerima = $('#tgl_terima_manual').val();
        const idCust = $('#id_cust_manual').val();
        const idEmployee = $('#idemployee_manual').val();
        const alasan = $('#alasan_manual').val();

        if (!noRetur || !tglTerima || !idCust || !idEmployee || !alasan) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Mohon lengkapi semua field yang wajib diisi!'
            });
            return;
        }

        // Prepare details
        const verifikasiDetails = scannedItems.map(item => ({
            kode_bar: item.kode_bar,
            pasang_fisik: item.pasang,
            keterangan: 'Manual Scan'
        }));

        // Confirm
        const totalPasang = scannedItems.reduce((sum, item) => sum + item.pasang, 0);

        Swal.fire({
            title: 'Konfirmasi Verifikasi Manual',
            html: `
            <p>Apakah data sudah benar?</p>
            <div class="mt-3 text-start">
                <strong>No Retur:</strong> ${noRetur}<br>
                <strong>Total Item:</strong> ${scannedItems.length}<br>
                <strong>Total Pasang:</strong> ${formatNumber(totalPasang)}
            </div>
        `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#28a745'
        }).then((result) => {
            if (result.isConfirmed) {
                submitManualVerification({
                    no_retur_manual: noRetur,
                    tgl_terima: tglTerima,
                    id_cust: idCust,
                    idemployee: idEmployee,
                    alasan: alasan,
                    catatan_verifikasi: $('#catatan_manual').val(),
                    verifikasi_details: verifikasiDetails
                });
            }
        });
    });

    // Submit Manual Verification
    function submitManualVerification(data) {
        const storeManualUrl = "{{ route('verifikasi-retur.store-manual') }}";

        Swal.fire({
            title: 'Menyimpan...',
            text: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: storeManualUrl,
            type: 'POST',
            data: {
                _token: $('input[name="_token"]').val(),
                ...data
            },
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: response.message,
                        confirmButtonText: 'OK'
                    }).then(() => {
                        resetManualForm();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: response.message
                    });
                }
            },
            error: function (xhr) {
                let errorMessage = 'Terjadi kesalahan';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        });
    }

    // Toast Notification Helper
    function showToast(icon, message) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });

        Toast.fire({
            icon: icon,
            title: message
        });
    }

    // Auto focus barcode input when tab is shown
    $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        if ($(e.target).attr('href') === '#tab_manual') {
            setTimeout(() => {
                $('#barcode_input').focus();
            }, 100);
        }
    });
});