/**
 * Verifikasi Retur Manual - Scan Barcode
 * File: verifikasi-retur-manual.js
 * Location: public/assets/js/custom/verifikasi-retur/
 */

document.addEventListener('DOMContentLoaded', function () {
    // Only initialize if manual tab exists
    if ($('#tab_manual').length > 0) {
        initializeManualScanComponents();
        console.log('Manual Scan Module Initialized');
    }
});

// Global state for manual scan
const manualScanState = {
    scannedItems: [],
    barcodeBuffer: '',
    barcodeTimer: null,
    lastKeypressTime: 0,
    totalPasang: 0
};

/**
 * Initialize all manual scan components
 */
function initializeManualScanComponents() {
    initializeSelect2Manual();
    initializeManualEventListeners();
    generateNoReturManual();
    setDefaultDate();
}

/**
 * Initialize Select2 for Customer and Employee
 */
function initializeSelect2Manual() {
    // Customer Select2 with AJAX
    $('#id_cust_manual').select2({
        placeholder: 'Pilih Customer...',
        allowClear: true,
        ajax: {
            url: getCustomerListUrl,
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term
                };
            },
            processResults: function (data) {
                return {
                    results: data.results
                };
            },
            cache: true
        },
        minimumInputLength: 0
    }).on('select2:select', function (e) {
        const customerId = e.params.data.id;
        loadCustomerDetails(customerId);
    }).on('select2:clear', function () {
        clearCustomerInfo();
    });

    // Employee Select2 with AJAX
    $('#idemployee_manual').select2({
        placeholder: 'Pilih Employee...',
        allowClear: true,
        ajax: {
            url: getEmployeeListUrl,
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term
                };
            },
            processResults: function (data) {
                return {
                    results: data.results
                };
            },
            cache: true
        },
        minimumInputLength: 0
    }).on('select2:select', function (e) {
        const empData = e.params.data;
        showEmployeeInfo(empData);
    }).on('select2:clear', function () {
        clearEmployeeInfo();
    });
}

/**
 * Generate No Retur format
 */
function generateNoReturManual() {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const periode = year + month;
    
    // Set placeholder with current periode
    $('#no_retur_manual').attr('placeholder', `RTR/${periode}/001`);
}

/**
 * Set default date to today
 */
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    $('#tgl_terima_manual').val(today);
}

/**
 * Load customer details by ID
 */
function loadCustomerDetails(customerId) {
    $.ajax({
        url: getCustomerUrl.replace(':id', customerId),
        type: 'GET',
        beforeSend: function() {
            $('#customer-info').hide();
            $('#cust-alamat').text('Loading...');
            $('#cust-telepon').text('Loading...');
        },
        success: function (response) {
            if (response.success) {
                const cust = response.data;
                $('#cust-alamat').text(cust.alamat || '-');
                $('#cust-telepon').text(cust.telepon || '-');
                $('#customer-info').slideDown();
            } else {
                toastr.warning('Data customer tidak ditemukan');
            }
        },
        error: function (xhr) {
            console.error('Error loading customer:', xhr);
            toastr.error('Gagal memuat data customer');
            $('#cust-alamat').text('-');
            $('#cust-telepon').text('-');
        }
    });
}

/**
 * Clear customer info display
 */
function clearCustomerInfo() {
    $('#customer-info').slideUp();
    $('#cust-alamat').text('-');
    $('#cust-telepon').text('-');
}

/**
 * Show employee info from select2 data
 */
function showEmployeeInfo(empData) {
    const text = empData.text;
    const parts = text.split(' - ');
    const empId = parts[0];
    
    // Extract cabang from text like "ID - Name (Cab: XXX)"
    const cabMatch = text.match(/\(Cab: (.+)\)/);
    const cabang = cabMatch ? cabMatch[1] : '-';
    
    $('#emp-id').text(empId);
    $('#emp-cabang').text(cabang);
    $('#employee-info').slideDown();
}

/**
 * Clear employee info display
 */
function clearEmployeeInfo() {
    $('#employee-info').slideUp();
    $('#emp-id').text('-');
    $('#emp-cabang').text('-');
}

/**
 * Initialize all event listeners
 */
function initializeManualEventListeners() {
    // Barcode input handler - keyup for scanner detection
    $('#barcode_input').on('keyup', handleManualBarcodeScanner);
    
    // Manual enter key on barcode input
    $('#barcode_input').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            const barcode = $(this).val().trim();
            const pasang = parseInt($('#pasang_input').val()) || 1;
            
            if (barcode) {
                searchAndAddProduct(barcode, pasang);
            }
        }
    });
    
    // Pasang input - add on Enter
    $('#pasang_input').on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            const barcode = $('#barcode_input').val().trim();
            const pasang = parseInt($(this).val()) || 1;
            
            if (barcode) {
                searchAndAddProduct(barcode, pasang);
            } else {
                $('#barcode_input').focus();
            }
        }
    });
    
    // Reset button
    $('#btn-reset-manual').on('click', resetManualForm);
    
    // Form submit
    $('#manual-scan-form').on('submit', submitManualVerification);
    
    // Auto focus on barcode input when tab is shown
    $('a[href="#tab_manual"]').on('shown.bs.tab', function () {
        setTimeout(function() {
            $('#barcode_input').focus();
        }, 100);
    });
}

/**
 * Handle barcode scanner input (auto-detect scanner vs manual typing)
 */
function handleManualBarcodeScanner(e) {
    const currentTime = new Date().getTime();
    const keyCode = e.which;

    // Check if this is rapid input (scanner) vs slow input (typing)
    if (currentTime - manualScanState.lastKeypressTime < 50 && keyCode >= 32 && keyCode <= 126) {
        // Clear existing timer
        if (manualScanState.barcodeTimer) {
            clearTimeout(manualScanState.barcodeTimer);
        }

        // Add character to buffer
        manualScanState.barcodeBuffer += String.fromCharCode(keyCode);

        // Set new timer - process buffer after 50ms of inactivity
        manualScanState.barcodeTimer = setTimeout(() => {
            if (manualScanState.barcodeBuffer.length >= 5) {
                const pasang = parseInt($('#pasang_input').val()) || 1;
                searchAndAddProduct(manualScanState.barcodeBuffer, pasang);
                $('#barcode_input').val('');
                $('#pasang_input').val(1);
            }
            manualScanState.barcodeBuffer = '';
        }, 50);
    } else {
        // Reset buffer if typing is too slow (manual entry)
        manualScanState.barcodeBuffer = '';
    }

    manualScanState.lastKeypressTime = currentTime;
}

/**
 * Search product by barcode and add to list
 */
function searchAndAddProduct(barcode, pasang) {
    // Validate inputs
    if (!barcode || barcode.trim() === '') {
        toastr.warning('Barcode tidak boleh kosong');
        return;
    }

    if (!pasang || pasang < 1) {
        toastr.warning('Jumlah pasang minimal 1');
        return;
    }

    $.ajax({
        url: getProductUrl.replace(':barcode', encodeURIComponent(barcode)),
        type: 'GET',
        beforeSend: function () {
            showBarcodeLoader();
        },
        success: function (response) {
            hideBarcodeLoader();
            if (response.success) {
                addScannedProduct(response.data, pasang);
                playSuccessBeep();
            } else {
                toastr.error(response.message || 'Produk tidak ditemukan');
                $('#barcode_input').select();
            }
        },
        error: function (xhr) {
            hideBarcodeLoader();
            const message = xhr.responseJSON?.message || 'Error mencari produk';
            toastr.error(message);
            $('#barcode_input').select();
        }
    });
}

/**
 * Add scanned product to the list
 */
function addScannedProduct(product, pasang) {
    // Check if product already exists
    const existingIndex = manualScanState.scannedItems.findIndex(
        item => item.kode_bar === product.kode_bar
    );

    if (existingIndex !== -1) {
        // Update existing item
        manualScanState.scannedItems[existingIndex].pasang_fisik += pasang;
        updateScannedItemRow(manualScanState.scannedItems[existingIndex]);
        
        toastr.success(`${product.nama_product} - Qty updated!`);
    } else {
        // Add new item
        const newItem = {
            kode_bar: product.kode_bar,
            nama_product: product.nama_product,
            art: product.art || '-',
            color: product.color || '-',
            size: product.size || '-',
            pasang_fisik: pasang,
            keterangan: ''
        };
        
        manualScanState.scannedItems.push(newItem);
        addScannedItemRow(newItem);
        
        toastr.success(`${product.nama_product} ditambahkan!`);
    }

    updateManualTotals();
    
    // Clear and focus back to barcode input
    $('#barcode_input').val('').focus();
    $('#pasang_input').val(1);
}

/**
 * Add new row to scanned items table
 */
function addScannedItemRow(item) {
    // Remove empty message if exists
    $('#empty-scan-row').remove();
    
    const rowNum = manualScanState.scannedItems.length;
    const newRow = `
        <tr id="scan-item-${item.kode_bar}" class="new-item-highlight">
            <td class="text-center">${rowNum}</td>
            <td>${item.kode_bar}</td>
            <td>${item.nama_product}</td>
            <td class="text-center">${item.art}</td>
            <td class="text-center">${item.color}</td>
            <td class="text-center">${item.size}</td>
            <td>
                <input type="number" 
                    class="form-control form-control-sm text-center pasang-fisik-input" 
                    data-barcode="${item.kode_bar}"
                    value="${item.pasang_fisik}" 
                    min="1">
            </td>
            <td class="text-center">
                <button type="button" 
                    class="btn btn-sm btn-danger remove-scan-item" 
                    data-barcode="${item.kode_bar}"
                    title="Hapus item">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
    
    $('#scanned-items-tbody').append(newRow);
    
    // Scroll to new item
    scrollToScannedItem(item.kode_bar);
    
    // Attach event handlers
    attachScannedItemEvents(item.kode_bar);
    
    // Remove highlight animation after 2 seconds
    setTimeout(() => {
        $(`#scan-item-${item.kode_bar}`).removeClass('new-item-highlight');
    }, 2000);
}

/**
 * Update existing row in scanned items table
 */
function updateScannedItemRow(item) {
    const row = $(`#scan-item-${item.kode_bar}`);
    row.find('.pasang-fisik-input').val(item.pasang_fisik);
    
    // Add update highlight
    row.addClass('updated-item-highlight');
    
    // Scroll to updated item
    scrollToScannedItem(item.kode_bar);
    
    setTimeout(() => {
        row.removeClass('updated-item-highlight');
    }, 2000);
}

/**
 * Scroll to specific scanned item
 */
function scrollToScannedItem(barcode) {
    const element = $(`#scan-item-${barcode}`)[0];
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Attach event handlers to scanned item row
 */
function attachScannedItemEvents(barcode) {
    // Pasang fisik input change
    $(`.pasang-fisik-input[data-barcode="${barcode}"]`).on('change', function () {
        const newPasang = parseInt($(this).val()) || 1;
        updateScannedItemPasang(barcode, newPasang);
    });
    
    // Remove button click
    $(`.remove-scan-item[data-barcode="${barcode}"]`).on('click', function () {
        removeScannedItem(barcode);
    });
}

/**
 * Update pasang quantity for specific item
 */
function updateScannedItemPasang(barcode, newPasang) {
    const item = manualScanState.scannedItems.find(i => i.kode_bar === barcode);
    if (item) {
        item.pasang_fisik = Math.max(1, newPasang);
        updateManualTotals();
    }
}

/**
 * Remove scanned item from list
 */
function removeScannedItem(barcode) {
    Swal.fire({
        title: 'Hapus Item?',
        text: 'Item akan dihapus dari daftar scan',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Remove from state
            manualScanState.scannedItems = manualScanState.scannedItems.filter(
                item => item.kode_bar !== barcode
            );
            
            // Remove from DOM with animation
            $(`#scan-item-${barcode}`).fadeOut(300, function () {
                $(this).remove();
                
                if (manualScanState.scannedItems.length === 0) {
                    showEmptyScannedMessage();
                } else {
                    // Renumber rows
                    $('#scanned-items-tbody tr').each(function (index) {
                        $(this).find('td:first').text(index + 1);
                    });
                }
                
                updateManualTotals();
            });
            
            toastr.info('Item berhasil dihapus');
            $('#barcode_input').focus();
        }
    });
}

/**
 * Update manual totals display
 */
function updateManualTotals() {
    manualScanState.totalPasang = manualScanState.scannedItems.reduce(
        (sum, item) => sum + item.pasang_fisik, 0
    );
    
    $('#total-pasang-manual').text(manualScanState.totalPasang);
}

/**
 * Show empty scanned message
 */
function showEmptyScannedMessage() {
    $('#scanned-items-tbody').html(`
        <tr id="empty-scan-row">
            <td colspan="8" class="text-center text-muted">
                Belum ada item yang discan
            </td>
        </tr>
    `);
}

/**
 * Show loader on barcode input
 */
function showBarcodeLoader() {
    $('#barcode_input').prop('disabled', true).val('Mencari...');
}

/**
 * Hide loader on barcode input
 */
function hideBarcodeLoader() {
    $('#barcode_input').prop('disabled', false).val('').focus();
}

/**
 * Play success beep sound
 */
function playSuccessBeep() {
    try {
        if (window.AudioContext || window.webkitAudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = 1800;
            gainNode.gain.value = 0.3;

            oscillator.start();
            setTimeout(() => oscillator.stop(), 100);
        }
    } catch (error) {
        console.log('Audio not supported');
    }
}

/**
 * Submit manual verification form
 */
function submitManualVerification(e) {
    e.preventDefault();
    
    // Validation
    if (manualScanState.scannedItems.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Peringatan',
            text: 'Belum ada item yang discan! Silakan scan minimal 1 item.',
            confirmButtonText: 'OK'
        });
        $('#barcode_input').focus();
        return;
    }
    
    const noRetur = $('#no_retur_manual').val().trim();
    const tglTerima = $('#tgl_terima_manual').val();
    const idCust = $('#id_cust_manual').val();
    const idEmployee = $('#idemployee_manual').val();
    const alasan = $('#alasan_manual').val().trim();
    
    // Validate required fields
    let errors = [];
    if (!noRetur) errors.push('No Retur Manual harus diisi');
    if (!tglTerima) errors.push('Tanggal Terima harus diisi');
    if (!idCust) errors.push('Customer harus dipilih');
    if (!idEmployee) errors.push('Sales/Employee harus dipilih');
    if (!alasan) errors.push('Alasan Retur harus diisi');
    
    if (errors.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Validasi Error',
            html: errors.join('<br>'),
            confirmButtonText: 'OK'
        });
        return;
    }
    
    // Confirm before submit
    Swal.fire({
        title: 'Konfirmasi Simpan',
        html: `
            <div class="text-start">
                <p><strong>No Retur:</strong> ${noRetur}</p>
                <p><strong>Tanggal:</strong> ${formatDate(tglTerima)}</p>
                <p><strong>Total Item:</strong> ${manualScanState.scannedItems.length}</p>
                <p><strong>Total Pasang:</strong> ${manualScanState.totalPasang}</p>
                <hr>
                <p class="text-danger">Pastikan data sudah benar!</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Simpan',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            processManualSubmit();
        }
    });
}

/**
 * Process manual verification submission
 */
function processManualSubmit() {
    // Prepare data
    const formData = {
        no_retur_manual: $('#no_retur_manual').val().trim(),
        tgl_terima: $('#tgl_terima_manual').val(),
        id_cust: $('#id_cust_manual').val(),
        idemployee: $('#idemployee_manual').val(),
        alasan: $('#alasan_manual').val().trim(),
        catatan_verifikasi: $('#catatan_manual').val().trim(),
        verifikasi_details: manualScanState.scannedItems.map(item => ({
            kode_bar: item.kode_bar,
            pasang_fisik: item.pasang_fisik,
            keterangan: item.keterangan || 'Manual Scan'
        }))
    };
    
    // Show loading
    Swal.fire({
        title: 'Menyimpan Data...',
        html: 'Mohon tunggu, sedang memproses data',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Submit via AJAX
    $.ajax({
        url: storeManualUrl,
        type: 'POST',
        data: JSON.stringify(formData),
        contentType: 'application/json',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        success: function (response) {
            Swal.close();
            
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    html: `
                        <div class="text-start">
                            <p>${response.message}</p>
                            <hr>
                            <p><strong>No Retur:</strong> ${response.data.no_retur}</p>
                            <p><strong>Total Item:</strong> ${response.data.total_item}</p>
                            <p><strong>Total Pasang:</strong> ${response.data.total_pasang}</p>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: 'OK'
                }).then(() => {
                    // Redirect to index page
                    window.location.href = '/admin/manufacture/verifikasi-retur';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: response.message || 'Terjadi kesalahan saat menyimpan data',
                    confirmButtonText: 'OK'
                });
            }
        },
        error: function (xhr) {
            Swal.close();
            
            let errorMessage = 'Terjadi kesalahan saat menyimpan data';
            
            if (xhr.responseJSON) {
                if (xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                // Handle validation errors
                if (xhr.responseJSON.errors) {
                    const errors = Object.values(xhr.responseJSON.errors).flat();
                    errorMessage = errors.join('<br>');
                }
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                html: errorMessage,
                confirmButtonText: 'OK'
            });
            
            console.error('Submit error:', xhr);
        }
    });
}

/**
 * Reset manual form
 */
function resetManualForm() {
    if (manualScanState.scannedItems.length === 0) {
        toastr.info('Form sudah kosong');
        return;
    }
    
    Swal.fire({
        title: 'Reset Form?',
        text: 'Semua data yang sudah diinput akan hilang',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Reset',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Reset state
            manualScanState.scannedItems = [];
            manualScanState.totalPasang = 0;
            manualScanState.barcodeBuffer = '';
            
            // Reset form inputs
            $('#manual-scan-form')[0].reset();
            
            // Reset select2
            $('#id_cust_manual').val(null).trigger('change');
            $('#idemployee_manual').val(null).trigger('change');
            
            // Hide info sections
            $('#customer-info').slideUp();
            $('#employee-info').slideUp();
            
            // Clear customer & employee info
            clearCustomerInfo();
            clearEmployeeInfo();
            
            // Reset table
            showEmptyScannedMessage();
            updateManualTotals();
            
            // Reset date & no retur
            setDefaultDate();
            generateNoReturManual();
            
            // Focus on first input
            $('#no_retur_manual').focus();
            
            toastr.success('Form berhasil direset');
        }
    });
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

/**
 * Utility: Format number as Indonesian currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Export functions if needed
window.manualScanModule = {
    reset: resetManualForm,
    getScannedItems: () => manualScanState.scannedItems,
    getTotalPasang: () => manualScanState.totalPasang
};