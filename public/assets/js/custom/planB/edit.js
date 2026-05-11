// edit.js - JavaScript untuk Edit Perencanaan Produksi

$(document).ready(function () {
    // Initialize form elements
    initializeForm();

    // Load existing data
    loadExistingData();

    // Set up event listeners
    setupEventListeners();

    // Set field restrictions based on status
    setStatusRestrictions();
});

function initializeForm() {
    // Initialize Select2
    $('#product_id').select2({
        placeholder: 'Pilih Artikel',
        allowClear: true
    });

    $('#mc_id').select2({
        placeholder: 'Pilih Mesin',
        allowClear: true
    });

    $('#type').select2({
        placeholder: 'Pilih Tipe',
        allowClear: true
    });

    $('#warehouse').select2({
        placeholder: 'Pilih Gudang Online',
        allowClear: true
    });

    // Initialize date picker
    $("#date_plan").daterangepicker({
        singleDatePicker: true,
        showDropdowns: true,
        minYear: 2020,
        maxYear: parseInt(moment().format("YYYY")) + 1,
        locale: {
            format: 'YYYY-MM-DD'
        }
    });

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

function loadExistingData() {
    // Data sudah di-populate dari server-side
    // Trigger change events untuk memuat data terkait
    if (existingPlan.product_id) {
        setTimeout(() => {
            $('#product_id').trigger('change');
        }, 500);
    }

    if (existingPlan.mc_id) {
        setTimeout(() => {
            $('#mc_id').trigger('change');
        }, 800);
    }
}

function setupEventListeners() {
    // Product selection change
    $('#product_id').on('change', function () {
        const productId = $(this).val();
        if (productId) {
            loadProductDetails(productId);
            loadBomDetails(productId);
            loadProcessDetails(productId);
        } else {
            clearDetailTable();
        }
    });

    // Machine selection change
    $('#mc_id').on('change', function () {
        const selectedMachines = $(this).val();
        if (selectedMachines && selectedMachines.length > 0) {
            updateMachineType(selectedMachines);
        }
    });

    // Type selection change
    $('#type').on('change', function () {
        const type = $(this).val();
        toggleWarehouseField(type);
    });

    // Quantity input changes
    $(document).on('input', 'input[name="qty[]"]', function () {
        const row = $(this).closest('tr');
        calculateRowSpk(row);
        calculateTotals();
    });

    $(document).on('input', 'input[name="qty_per_spk[]"]', function () {
        const row = $(this).closest('tr');
        calculateRowSpk(row);
        calculateTotals();
    });

    // Form submission
    $('#plan-form').on('submit', function (e) {
        e.preventDefault();
        handleFormSubmission();
    });
}

function setStatusRestrictions() {
    const restrictedStatuses = ['production_approved', 'processing', 'completed'];

    if (restrictedStatuses.includes(existingPlan.status)) {
        // Disable product and machine selection
        $('#product_id').prop('disabled', true);
        $('#mc_id').prop('disabled', true);

        // Add visual indicator
        $('#product_id, #mc_id').addClass('readonly-field');

        // Show warning message
        const warningHtml = `
            <div class="alert alert-warning mt-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Perhatian:</strong> Artikel dan mesin tidak dapat diubah karena status perencanaan saat ini adalah "${existingPlan.status}".
            </div>
        `;
        $('.card-body').prepend(warningHtml);
    }

    // If completed, make most fields readonly
    if (existingPlan.status === 'completed') {
        $('#type, #warehouse').prop('disabled', true);
        $('input[name="qty[]"], input[name="qty_per_spk[]"]').prop('readonly', true);

        const completedWarning = `
            <div class="alert alert-info mt-3">
                <i class="bi bi-info-circle-fill me-2"></i>
                <strong>Info:</strong> Perencanaan ini telah selesai. Hanya catatan yang dapat diubah.
            </div>
        `;
        $('.card-body').prepend(completedWarning);
    }
}

function loadProductDetails(productId) {
    $.ajax({
        url: getDetails,
        method: 'POST',
        data: {
            product_id: productId,
            _token: csrfToken
        },
        success: function (response) {
            console.log(response);
            
            if (response.success) {
                updateProductInfo(response.data);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error loading product details:', error);
            toastr.error('Gagal memuat detail produk');
        }
    });
}

function loadBomDetails(productId) {
    $.ajax({
        url: getBomDetail,
        method: 'GET',
        data: { product_id: productId },
        success: function (response) {
            if (response.success) {
                buildDetailTable(response.data);
                // Populate with existing data after table is built
                setTimeout(() => {
                    populateExistingDetails();
                }, 500);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error loading BOM details:', error);
            toastr.error('Gagal memuat detail BOM');
        }
    });
}

function loadProcessDetails(productId) {
    $.ajax({
        url: getProcess,
        method: 'GET',
        data: { product_id: productId },
        success: function (response) {
            if (response.success) {
                updateProcessInfo(response.data);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error loading process details:', error);
            toastr.error('Gagal memuat detail proses');
        }
    });
}

function updateMachineType(selectedMachines) {
    // Update machine type based on selection
    const machineTypes = selectedMachines.map(id => {
        const option = $(`#mc_id option[value="${id}"]`);
        return option.text();
    });

    $('#type_mc').val(machineTypes.join(', '));
}

function toggleWarehouseField(type) {
    const warehouseGroup = $('#warehouse').closest('.form-group');
    if (type === 'Online') {
        warehouseGroup.show();
        $('#warehouse').prop('required', true);
    } else {
        warehouseGroup.hide();
        $('#warehouse').prop('required', false);
        $('#warehouse').val('');
    }
}

function buildDetailTable(bomData) {
    const tbody = $('#table_detail tbody');
    tbody.empty();

    if (bomData && bomData.length > 0) {
        bomData.forEach((item, index) => {
            const row = `
                <tr class="detail-row" data-size="${item.size}">
                    <td class="text-center">${index + 1}</td>
                    <td>${item.size}</td>
                    <td class="text-center">
                        <input type="number" class="form-control text-center" 
                               name="qty[]" min="0" step="1" value="0">
                        <input type="hidden" name="size[]" value="${item.size}">
                    </td>
                    <td class="text-center">
                        <input type="number" class="form-control text-center" 
                               name="qty_per_spk[]" min="1" step="1" value="1">
                    </td>
                    <td class="text-center">
                        <input type="number" class="form-control text-center" 
                               name="total_spk[]" readonly value="0">
                    </td>
                    <td>
                        <input type="text" class="form-control" 
                               name="note_detail[]" placeholder="Catatan...">
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    } else {
        tbody.append('<tr><td colspan="6" class="text-center">Tidak ada data BOM</td></tr>');
    }
}

function populateExistingDetails() {
    if (existingDetails && existingDetails.length > 0) {
        existingDetails.forEach(detail => {
            const row = $(`#table_detail tbody tr[data-size="${detail.size}"]`);
            if (row.length > 0) {
                row.find('input[name="qty[]"]').val(detail.qty || 0);
                row.find('input[name="qty_per_spk[]"]').val(detail.qty_per_spk || 1);
                row.find('input[name="total_spk[]"]').val(detail.total_spk || 0);
                row.find('input[name="note_detail[]"]').val(detail.note_detail || '');
            }
        });

        // Recalculate totals after populating
        calculateTotals();
    }
}

function calculateRowSpk(row) {
    const qty = parseFloat(row.find('input[name="qty[]"]').val()) || 0;
    const qtyPerSpk = parseFloat(row.find('input[name="qty_per_spk[]"]').val()) || 1;

    const totalSpk = qtyPerSpk > 0 ? Math.ceil(qty / qtyPerSpk) : 0;
    row.find('input[name="total_spk[]"]').val(totalSpk);
}

function calculateTotals() {
    let totalQty = 0;
    let totalSpk = 0;

    $('#table_detail tbody tr').each(function () {
        const qty = parseFloat($(this).find('input[name="qty[]"]').val()) || 0;
        const spk = parseFloat($(this).find('input[name="total_spk[]"]').val()) || 0;

        totalQty += qty;
        totalSpk += spk;
    });

    // Update total display
    $('#total_qty').text(totalQty.toLocaleString());
    $('#total_spk').text(totalSpk.toLocaleString());
}

function updateProductInfo(productData) {
    // Update product information display if needed
    console.log('Product data loaded:', productData);
}

function updateProcessInfo(processData) {
    // Update process information display if needed
    console.log('Process data loaded:', processData);
}

function clearDetailTable() {
    $('#table_detail tbody').empty();
    $('#total_qty').text('0');
    $('#total_spk').text('0');
}

function validateForm() {
    let isValid = true;
    const errors = [];

    // Check required fields
    if (!$('#product_id').val()) {
        errors.push('Silakan pilih artikel');
        isValid = false;
    }

    if (!$('#mc_id').val() || $('#mc_id').val().length === 0) {
        errors.push('Silakan pilih mesin');
        isValid = false;
    }

    if (!$('#type').val()) {
        errors.push('Silakan pilih tipe');
        isValid = false;
    }

    if ($('#type').val() === 'Online' && !$('#warehouse').val()) {
        errors.push('Silakan pilih gudang online');
        isValid = false;
    }

    if (!$('#date_plan').val()) {
        errors.push('Silakan pilih tanggal');
        isValid = false;
    }

    // Check if at least one detail has quantity
    let hasQty = false;
    $('#table_detail tbody tr').each(function () {
        const qty = parseFloat($(this).find('input[name="qty[]"]').val()) || 0;
        if (qty > 0) {
            hasQty = true;
            return false; // break loop
        }
    });

    if (!hasQty) {
        errors.push('Silakan masukkan quantity untuk minimal satu ukuran');
        isValid = false;
    }

    // Validate quantity values
    $('#table_detail tbody tr').each(function () {
        const qty = parseFloat($(this).find('input[name="qty[]"]').val()) || 0;
        const qtyPerSpk = parseFloat($(this).find('input[name="qty_per_spk[]"]').val()) || 0;

        if (qty > 0 && qtyPerSpk <= 0) {
            errors.push('Quantity per SPK harus lebih dari 0');
            isValid = false;
            return false; // break loop
        }
    });

    if (!isValid) {
        // Show validation errors
        const errorMessage = errors.join('\n');
        toastr.error(errorMessage);
    }

    return isValid;
}

function handleFormSubmission() {
    if (!validateForm()) {
        return false;
    }

    // Show confirmation dialog
    const confirmMessage = existingPlan.status === 'completed'
        ? 'Apakah Anda yakin ingin mengupdate catatan perencanaan ini?'
        : 'Apakah Anda yakin ingin mengupdate perencanaan ini?';

    if (confirm(confirmMessage)) {
        // Show loading indicator
        const submitBtn = $('#plan-form button[type="submit"]');
        const originalText = submitBtn.html();

        submitBtn.prop('disabled', true);
        submitBtn.html('<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...');

        // Collect form data
        const formData = new FormData($('#plan-form')[0]);

        // Add date from picker
        formData.set('date', $('#date_plan').val());

        // Submit form via AJAX
        $.ajax({
            url: $('#plan-form').attr('action'),
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    toastr.success(response.message || 'Perencanaan berhasil diupdate');

                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = response.redirect || "{{ route('planmanufaktureB.index') }}";
                    }, 1500);
                } else {
                    toastr.error(response.message || 'Gagal mengupdate perencanaan');
                    submitBtn.prop('disabled', false);
                    submitBtn.html(originalText);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error updating plan:', error);

                let errorMessage = 'Gagal mengupdate perencanaan';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.responseJSON && xhr.responseJSON.errors) {
                    const errors = Object.values(xhr.responseJSON.errors).flat();
                    errorMessage = errors.join('\n');
                }

                toastr.error(errorMessage);
                submitBtn.prop('disabled', false);
                submitBtn.html(originalText);
            }
        });
    }
}

// Additional utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

function resetForm() {
    $('#plan-form')[0].reset();
    $('#product_id').val('').trigger('change');
    $('#mc_id').val('').trigger('change');
    $('#type').val('').trigger('change');
    $('#warehouse').val('').trigger('change');
    clearDetailTable();
}

// Handle page refresh/leave confirmation
window.addEventListener('beforeunload', function (e) {
    const hasChanges = checkForChanges();
    if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman?';
    }
});

function checkForChanges() {
    // Simple check for form changes
    // This can be enhanced to track specific field changes
    const currentData = {
        product_id: $('#product_id').val(),
        mc_id: $('#mc_id').val(),
        type: $('#type').val(),
        warehouse: $('#warehouse').val(),
        date: $('#date_plan').val(),
        note: $('#note').val()
    };

    // Compare with original data
    const originalData = {
        product_id: existingPlan.product_id,
        mc_id: existingPlan.mc_id,
        type: existingPlan.type,
        warehouse: existingPlan.warehouse,
        date: existingPlan.date,
        note: existingPlan.note
    };

    return JSON.stringify(currentData) !== JSON.stringify(originalData);
}

// Initialize tooltips and other UI enhancements
function initializeUIEnhancements() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Add input formatting for number fields
    $('input[type="number"]').on('input', function () {
        let value = $(this).val();
        if (value < 0) {
            $(this).val(0);
        }
    });

    // Add keyboard shortcuts
    $(document).keydown(function (e) {
        // Ctrl+S to save
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            $('#plan-form').trigger('submit');
        }

        // Escape to cancel
        if (e.keyCode === 27) {
            if (confirm('Apakah Anda yakin ingin membatalkan perubahan?')) {
                window.location.href = "{{ route('planmanufaktureB.index') }}";
            }
        }
    });
}

// Call UI enhancements on document ready
$(document).ready(function () {
    initializeUIEnhancements();
});