document.addEventListener('DOMContentLoaded', function () {
    initializeComponents();
    initializeEventListeners();
    generateInvoiceNumber();
    toggleWarehouseField();
});

// Global state for cart
const cartState = {
    items: [],
    tax: 0,
    discount: 0,
    shipping: 0,
    reference: ''
};

function initializeComponents() {
    $("#date_plan").daterangepicker();
    initializeSelect2();
    initializeFormValidation();
}

function initializeEventListeners() {
    $('#product_id').on('change', function () {
        const productId = $(this).val();
        if (productId) {
            // Show loading SweetAlert
            Swal.fire({
                title: 'Loading...',
                icon: 'info',
                html: 'Mengambil data produk',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            // Clear existing table data
            $('#table_detail tbody').empty();
            $('#table_component tbody').empty();
            $('#table_process tbody').empty();
            $('#bahanDasarTable tbody').empty();
            $('#table_spec input').val(''); // Clear existing spec inputs

            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            // Use Promise.all to track all AJAX requests
            const promises = [];
            // Get product details
            const detailsPromise = $.ajax({
                url: getDetails,
                type: 'POST',
                data: {
                    product_id: productId,
                    _token: csrfToken
                },
                success: function (response) {
                    $('#id_product').val(productId);
                    const rowCount = $('#table_detail tbody tr').length;
                    if (rowCount > 0) {
                        Swal.close();
                        Swal.fire({
                            icon: 'error',
                            title: 'Maaf...',
                            text: 'Hanya dapat menambahkan satu artikel!',
                        });
                        return;
                    }
                    $('#table_detail tbody').append(response);
                }
            });
            promises.push(detailsPromise);
            // Get BOM details
            const bomPromise = $.ajax({
                url: getBomDetail,
                type: 'POST',
                data: {
                    product_id: productId,
                    _token: csrfToken
                },
                success: function (dataDetails) {
                    $('#table_component tbody').append(dataDetails);
                    calculateGrandtotal();
                }
            });
            promises.push(bomPromise);
            // Get process data
            const processPromise = $.ajax({
                url: getProcess,
                type: 'POST',
                data: {
                    _token: csrfToken
                },
                success: function (dataProcess) {
                    $('#table_process tbody').append(dataProcess);
                }
            });
            promises.push(processPromise);
            // Get material data
            const materialPromise = $.ajax({
                url: getMaterial,
                type: 'POST',
                data: {
                    product_id: productId,
                    _token: csrfToken
                },
                success: function (dataMaterial) {
                    $('#bahanDasarTable tbody').append(dataMaterial);
                }
            });
            promises.push(materialPromise);

            // TAMBAHAN: Get specification data
            const specPromise = $.ajax({
                url: getSpecifications,
                type: 'POST',
                data: {
                    product_id: productId,
                    _token: csrfToken
                },
                success: function (dataSpec) {
                    if (dataSpec) {
                        // Karet
                        $('#karet_1_panjang').val(
                            (dataSpec.karet_1_panjang_HT_168 && dataSpec.karet_1_panjang_HT_168 !== '0.00')
                                ? dataSpec.karet_1_panjang_HT_168
                                : (dataSpec.karet_1_panjang_DK_168 || '')
                        );
                        $('#karet_1_putaran').val(
                            (dataSpec.karet_1_putaran_HT_168 && dataSpec.karet_1_putaran_HT_168 !== '0.00')
                                ? dataSpec.karet_1_putaran_HT_168
                                : (dataSpec.karet_1_putaran_DK_168 || '')
                        );
                        $('#karet_1_lebar').val(
                            (dataSpec.karet_1_lebar_HT_168 && dataSpec.karet_1_lebar_HT_168 !== '0.00')
                                ? dataSpec.karet_1_lebar_HT_168
                                : (dataSpec.karet_1_lebar_DK_168 || '')
                        );
                        $('#tarikan_karet').val(
                            (dataSpec.karet_1_tarikan_HT_168 && dataSpec.karet_1_tarikan_HT_168 !== '0.00')
                                ? dataSpec.karet_1_tarikan_HT_168
                                : (dataSpec.karet_1_tarikan_DK_168 || '')
                        );

                        // Bodi 1
                        $('#body_1_panjang').val(
                            (dataSpec.body_1_panjang_HT_168 && dataSpec.body_1_panjang_HT_168 !== '0.00')
                                ? dataSpec.body_1_panjang_HT_168
                                : (dataSpec.body_1_panjang_DK_168 || '')
                        );
                        $('#body_1_putaran').val(
                            (dataSpec.body_1_putaran_HT_168 && dataSpec.body_1_putaran_HT_168 !== '0.00')
                                ? dataSpec.body_1_putaran_HT_168
                                : (dataSpec.body_1_putaran_DK_168 || '')
                        );
                        $('#body_1_lebar').val(
                            (dataSpec.body_1_lebar_HT_168 && dataSpec.body_1_lebar_HT_168 !== '0.00')
                                ? dataSpec.body_1_lebar_HT_168
                                : (dataSpec.body_1_lebar_DK_168 || '')
                        );
                        $('#body_1_tarikan').val(
                            (dataSpec.body_1_tarikan_HT_168 && dataSpec.body_1_tarikan_HT_168 !== '0.00')
                                ? dataSpec.body_1_tarikan_HT_168
                                : (dataSpec.body_1_tarikan_DK_168 || '')
                        );

                        // Bodi 2
                        $('#body_2_panjang').val(
                            (dataSpec.body_2_panjang_HT_168 && dataSpec.body_2_panjang_HT_168 !== '0.00')
                                ? dataSpec.body_2_panjang_HT_168
                                : (dataSpec.body_2_panjang_DK_168 || '')
                        );
                        $('#body_2_putaran').val(
                            (dataSpec.body_2_putaran_HT_168 && dataSpec.body_2_putaran_HT_168 !== '0.00')
                                ? dataSpec.body_2_putaran_HT_168
                                : (dataSpec.body_2_putaran_DK_168 || '')
                        );
                        $('#body_2_lebar').val(
                            (dataSpec.body_2_lebar_HT_168 && dataSpec.body_2_lebar_HT_168 !== '0.00')
                                ? dataSpec.body_2_lebar_HT_168
                                : (dataSpec.body_2_lebar_DK_168 || '')
                        );
                        $('#body_2_tarikan').val(
                            (dataSpec.body_2_tarikan_HT_168 && dataSpec.body_2_tarikan_HT_168 !== '0.00')
                                ? dataSpec.body_2_tarikan_HT_168
                                : (dataSpec.body_2_tarikan_DK_168 || '')
                        );
                    }
                }
            });
            promises.push(specPromise);

            // Close the loading alert when all requests are done
            $.when.apply($, promises).always(function () {
                setTimeout(function () {
                    Swal.close();
                }, 500); // Small delay to ensure DOM updates
            });
        } else {
            // Clear all tables if no product is selected
            $('#table_detail tbody').empty();
            $('#table_component tbody').empty();
            $('#table_process tbody').empty();
            $('#bahanDasarTable tbody').empty();
            $('#table_spec input').val(''); // Clear spec inputs
        }
    });

    $('#product_id').on('change', function () {
        const productId = $(this).val();
        if (productId) {
            // Get the selected product's acronym
            const selectedAcronym = getProductAcronym(productId);

            // Filter machines based on the product acronym
            filterMachinesByAcronym(selectedAcronym);
        } else {
            // Reset machine select if no product is selected
            resetMachineSelect();
        }
    });

    // Add this to your initializeEventListeners function
    $('input[name="type"]').on('change', function () {
        console.log('Selected type:', $(this).val());
    });

    // Add event listener for machine selection
    $('#mc_id').on('change', function () {
        updateMachinePICFields();
        displayMachineInfo();
    });

    // Add this to your initializeEventListeners function
    $(document).on('click', '.btn-remove-detail', function () {
        $(this).closest('tr').remove();
        calculateGrandtotal();
    });

    $('#type').on('change', function () {
        toggleWarehouseField();
    });

    // Form submission
    document.getElementById('plan-form').addEventListener('submit', handleFormSubmit);
}

function updateMachineOptions(machines) {
    const machineSelect = $('#mc_id');
    
    // Clear current options
    machineSelect.empty();
    
    // Add default option
    machineSelect.append($('<option>', {
        value: '',
        text: 'Pilih Mesin'
    }));
    
    // Add filtered machines
    if (machines && machines.length > 0) {
        machines.forEach(function(machine) {
            machineSelect.append($('<option>', {
                value: machine.id,
                text: machine.name
            }));
        });
        
        console.log(`Loaded ${machines.length} filtered machines`);
    } else {
        console.log('No machines to load');
    }
    
    // Refresh Select2 if it's being used
    if ($.fn.select2) {
        machineSelect.select2();
    } else {
        machineSelect.trigger('change');
    }
}

function resetMachineSelect() {
    const machineSelect = $('#mc_id');

    // Tampilkan loading pada select
    machineSelect.empty();
    machineSelect.append($('<option>', {
        value: '',
        text: 'Memuat mesin...'
    }));

    // Get all machines from server
    $.ajax({
        url: '/admin/manufacture/planmanufakture/get-all-machines',
        type: 'GET',
        dataType: 'json',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        success: function (response) {
            console.log(response);
            
            // Clear the select again
            machineSelect.empty();

            // Add default option
            machineSelect.append($('<option>', {
                value: '',
                text: 'Pilih Mesin'
            }));

            // Add all machines
            if (response.machines && response.machines.length > 0) {
                response.machines.forEach(function (machine) {
                    machineSelect.append($('<option>', {
                        value: machine.id,
                        text: machine.name
                    }));
                });

                console.log(`Loaded ${response.machines.length} machines`);
            } else {
                console.log('No machines returned from server');
            }

            // Refresh Select2 if it's being used
            if ($.fn.select2) {
                machineSelect.select2();
            } else {
                machineSelect.trigger('change');
            }
        },
        error: function (error) {
            console.error('Error fetching all machines:', error);

            // If error, still provide empty select with message
            machineSelect.empty();
            machineSelect.append($('<option>', {
                value: '',
                text: 'Error loading mesin'
            }));

            // Show error message
            Swal.fire({
                title: 'Error',
                text: 'Gagal memuat data mesin. Silakan coba lagi.',
                icon: 'error',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    });
}

function displayMachineInfo() {
    // Clear existing machine info
    $('#machine-info-container').empty();

    // Get selected machines
    const selectedMachines = $('#mc_id').val();

    if (selectedMachines && selectedMachines.length > 0) {
        // Create container for machine info if it doesn't exist
        if ($('#machine-info-container').length === 0) {
            $('#machine-pic-container').before('<div id="machine-info-container" class="mt-3"></div>');
        }

        // Fetch machine info for each selected machine
        selectedMachines.forEach(machineId => {
            // AJAX request to get machine details
            $.ajax({
                // url: getMachineInfo,
                url: '/admin/manufacture/planmanufakture/get-machine-info/' + machineId,
                type: 'GET',
                dataType: 'json',
                success: function (response) {
                    // Get machine name from the option text
                    const machineName = $('#mc_id option[value="' + machineId + '"]').text();

                    // Create HTML for machine info
                    const machineInfoHtml = `
                        <div class="card mb-2">
                            <div class="card-header mb-2">
                                <h5>Informasi Mesin: ${machineName}</h5>
                            </div>
                            <div class="card-body">
                                <table class="table table-bordered">
                                    <tr>
                                        <th width="30%">Tipe Mesin</th>
                                        <td>${response.type_mc || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Target</th>
                                        <td>${response.target || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>RPM</th>
                                        <td>${response.rpm || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Ukuran</th>
                                        <td>${response.ukuran || '-'}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    `;

                    // Append to container
                    $('#machine-info-container').append(machineInfoHtml);
                },
                error: function (error) {
                    console.error('Error fetching machine info:', error);
                }
            });
        });
    }
}

function updateMachinePICFields() {
    // Fungsi yang sudah ada tetap sama seperti sebelumnya
    $('#machine-pic-container').empty();
    const selectedMachines = $('#mc_id').val();
    if (selectedMachines && selectedMachines.length > 0) {
        if ($('#machine-pic-container').length === 0) {
            $('#mc_id').closest('.form-group').after('<div id="machine-pic-container" class="mt-3"></div>');
        }
        selectedMachines.forEach(machineId => {
            const machineName = $('#mc_id option[value="' + machineId + '"]').text();
            const picFieldHtml = `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>PIC untuk ${machineName}</h5>
                    </div>
                    <div class="card-body">
                        <div class="form-group mb-3">
                            <label for="pic_machine_${machineId}_1">PIC 1</label>
                            <input type="text" class="form-control" id="pic_machine_${machineId}_1"
                                   name="pic_machine[${machineId}][]" placeholder="Masukkan nama PIC 1" required>
                        </div>
                        <div class="form-group mb-3">
                            <label for="pic_machine_${machineId}_2">PIC 2</label>
                            <input type="text" class="form-control" id="pic_machine_${machineId}_2"
                                   name="pic_machine[${machineId}][]" placeholder="Masukkan nama PIC 2">
                        </div>
                        <div class="form-group mb-3">
                            <label for="pic_machine_${machineId}_3">PIC 3</label>
                            <input type="text" class="form-control" id="pic_machine_${machineId}_3"
                                   name="pic_machine[${machineId}][]" placeholder="Masukkan nama PIC 3">
                        </div>
                    </div>
                </div>
            `;
            $('#machine-pic-container').append(picFieldHtml);
        });
    }
}

// Function to toggle warehouse field visibility
function toggleWarehouseField() {
    const selectedType = $('#type').val();
    const warehouseContainer = $('#warehouse').closest('.flex-row-fluid');

    if (selectedType === 'Online') {
        warehouseContainer.show();
        $('#warehouse').prop('required', true);
    } else {
        warehouseContainer.hide();
        $('#warehouse').prop('required', false);
        $('#warehouse').val('').trigger('change'); // Clear the selection
    }
}

// function updateMachinePICFields() {
//     // Clear existing PIC fields
//     $('#machine-pic-container').empty();

//     // Get selected machines
//     const selectedMachines = $('#mc_id').val();

//     if (selectedMachines && selectedMachines.length > 0) {
//         // Create a container for the PIC fields if it doesn't exist
//         if ($('#machine-pic-container').length === 0) {
//             $('#mc_id').closest('.form-group').after('<div id="machine-pic-container" class="mt-3"></div>');
//         }

//         // Add 3 PIC inputs for each selected machine
//         selectedMachines.forEach(machineId => {
//             // Get machine name from the option text
//             const machineName = $('#mc_id option[value="' + machineId + '"]').text();

//             const picFieldHtml = `
//                 <div class="card mb-4">
//                     <div class="card-header">
//                         <h5>PIC untuk ${machineName}</h5>
//                     </div>
//                     <div class="card-body">
//                         <div class="form-group mb-3">
//                             <label for="pic_machine_${machineId}_1">PIC 1</label>
//                             <input type="text" class="form-control" id="pic_machine_${machineId}_1"
//                                    name="pic_machine[${machineId}][]" placeholder="Masukkan nama PIC 1" required>
//                         </div>
//                         <div class="form-group mb-3">
//                             <label for="pic_machine_${machineId}_2">PIC 2</label>
//                             <input type="text" class="form-control" id="pic_machine_${machineId}_2"
//                                    name="pic_machine[${machineId}][]" placeholder="Masukkan nama PIC 2">
//                         </div>
//                         <div class="form-group mb-3">
//                             <label for="pic_machine_${machineId}_3">PIC 3</label>
//                             <input type="text" class="form-control" id="pic_machine_${machineId}_3"
//                                    name="pic_machine[${machineId}][]" placeholder="Masukkan nama PIC 3">
//                         </div>
//                     </div>
//                 </div>
//             `;

//             $('#machine-pic-container').append(picFieldHtml);
//         });
//     }
// }

function initializeFormValidation() {
    const form = document.getElementById('plan-form');

    // Add custom validation classes and feedback elements
    const requiredInputs = form.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.value) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
                this.classList.add('is-invalid');
            }
        });
    });

    // Validate numeric inputs
    const numericInputs = form.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
        input.addEventListener('input', function () {
            const value = parseFloat(this.value);
            const min = parseFloat(this.getAttribute('min'));
            const max = parseFloat(this.getAttribute('max'));

            if (isNaN(value) || (min !== null && value < min) || (max !== null && value > max)) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            }
        });
    });
}

function initializeSelect2() {
    // Initialize product select2
    const productSelect = $('#product_id');
    productSelect.select2({
        placeholder: 'Pilih Artikel',
        allowClear: true
    });

    const mesinSelect = $('#mc_id');
    mesinSelect.select2({
        placeholder: 'Pilih Mesin',
        allowClear: true
    });
}

function generateInvoiceNumber() {
    $.ajax({
        url: generateSPK,
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        dataType: 'json',
        success: function (response) {
            cartState.invoiceNumber = response.code;
            $('#code').val(response.code);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            Swal.fire({
                text: 'Gagal generate No SPK',
                icon: 'error',
                toast: true,
                showConfirmButton: false,
                position: 'top-end',
                timer: 3000
            });
        }
    });
}

// Calculations
function calculateGrandtotal() {
    // Get quantity from detail table
    let totalQty = parseFloat($('input[name="quantity_detail[]"]').val()) || 0;
    let hppBahanBaku = parseFloat($('#hpp_bahan_baku').val()) || 0;
    let totalHpp = totalQty * hppBahanBaku;

    // Update quantity in component table
    $('.qty_component').each(function () {
        let baseQty = parseFloat($(this).data('base-qty')) || 0;
        let newQty = baseQty * totalQty;
        $(this).text(newQty.toFixed(2));
    });

    // Check if elements exist before updating them
    if ($('#total_qty_display').length > 0) {
        $('#total_qty_display').text(totalQty);
    }

    if ($('#total_hpp_display').length > 0) {
        $('#total_hpp_display').text('Rp. ' + formatNumber(totalHpp));
    }
}

// Add event listener for quantity changes in the detail table
$(document).on('change', 'input[name="quantity_detail[]"]', function () {
    calculateGrandtotal();
});

function formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

// Form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    try {
        // Get form data
        const form = document.getElementById('plan-form');
        const formData = new FormData(form);

        // Get the date range from daterangepicker
        const dateRange = $('#date_plan').data('daterangepicker');
        const startDate = dateRange.startDate.format('YYYY-MM-DD');
        const endDate = dateRange.endDate.format('YYYY-MM-DD');

        // Add the date values to formData
        formData.append('date', startDate);
        formData.append('planned_date', endDate);

        // Get type from select element
        const type = $('#type').val();
        formData.append('type', type);

        // Get selected machines and their PICs
        const selectedMachines = $('#mc_id').val();
        formData.append('mc_ids', JSON.stringify(selectedMachines));

        // Get PICs for each selected machine
        const machinePICs = {};
        selectedMachines.forEach(machineId => {
            // Get all PICs for this machine (up to 3)
            const pics = [];
            for (let i = 1; i <= 3; i++) {
                const picValue = $(`#pic_machine_${machineId}_${i}`).val();
                if (picValue && picValue.trim() !== '') {
                    pics.push(picValue);
                }
            }
            machinePICs[machineId] = pics;
        });
        formData.append('machine_pics', JSON.stringify(machinePICs));

        // Calculate totals
        let totalQty = 0;
        let totalHpp = 0;

        // Sum up quantities from all rows
        $('input[name="quantity_detail[]"]').each(function () {
            totalQty += parseFloat($(this).val()) || 0;
        });

        // Get HPP if available
        const hppBahanBaku = parseFloat($('#hpp_bahan_baku').val()) || 0;
        totalHpp = totalQty * hppBahanBaku;

        // Add calculated values
        formData.append('total_qty', totalQty);
        formData.append('total_hpp', totalHpp);

        // Build items array
        const items = [];
        const detailRows = $('#table_detail tbody tr.detail-row');

        if (detailRows.length > 0) {
            detailRows.each(function () {
                const row = $(this);

                // Extract data from the row
                const productId = row.find('input[name="id_product_detail[]"]').val();
                const productName = row.find('input[name="product_name_detail[]"]').val();
                const productCode = row.find('input[name="product_barcode_detail[]"]').val();
                const quantity = parseFloat(row.find('input[name="quantity_detail[]"]').val()) || 0;
                const notes = row.find('input[name="notes_detail[]"]').val() || '';

                items.push({
                    product_id: productId,
                    product_name: productName,
                    product_code: productCode,
                    quantity: quantity,
                    scheduled_date: endDate,
                    notes: notes
                });
            });
        }

        // Add items as JSON string
        formData.append('items', JSON.stringify(items));

        // Submit the form as form data
        const response = await fetch(e.target.action, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Accept': 'application/json'
                // Note: Do not set 'Content-Type' when using FormData
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error submitting purchase');
        }

        handleSubmissionSuccess(result);
    } catch (error) {
        console.error('Error details:', error);
        showErrorAlert(error.message || 'Error submitting purchase. Please try again.');
    }
}

function validateForm() {
    const productId = document.getElementById('product_id').value;
    if (!productId) {
        showErrorAlert('Silahkan Pilih Artikel terlebih dahulu.');
        return false;
    }

    // Check if type is selected - now using select element
    const selectedType = $('#type').val();
    if (!selectedType) {
        showErrorAlert('Silahkan pilih tipe produksi (Online/Offline).');
        return false;
    }

    // Check if machine is selected
    const selectedMachines = $('#mc_id').val();
    if (!selectedMachines || selectedMachines.length === 0) {
        showErrorAlert('Silahkan pilih mesin terlebih dahulu.');
        return false;
    }

    // // Check if PIC is entered for each machine
    // let picValid = true;
    // selectedMachines.forEach(machineId => {
    //     const picValue = $(`#pic_machine_${machineId}`).val();
    //     if (!picValue || picValue.trim() === '') {
    //         picValid = false;
    //     }
    // });

    // if (!picValid) {
    //     showErrorAlert('Silahkan isi PIC untuk setiap mesin yang dipilih.');
    //     return false;
    // }

    // Check if there are items in the table
    const detailRows = $('#table_detail tbody tr.detail-row');
    if (detailRows.length === 0) {
        showErrorAlert('Tidak ada item yang dipilih.');
        return false;
    }

    // Check if quantities are entered
    let valid = true;
    detailRows.each(function () {
        const qty = parseFloat($(this).find('input[name="quantity_detail[]"]').val());
        if (isNaN(qty) || qty <= 0) {
            showErrorAlert('Quantity harus diisi dengan nilai lebih dari 0.');
            valid = false;
            return false; // break the loop
        }
    });

    if (!valid) return false;

    return true;
}

// Create the form data object to be sent to the server
function createFormData() {
    // Get the date range from daterangepicker
    const dateRange = $('#date_plan').data('daterangepicker');
    const startDate = dateRange.startDate.format('YYYY-MM-DD');
    const endDate = dateRange.endDate.format('YYYY-MM-DD');

    // Get selected type (online/offline)
    // const type = $('input[name="type"]:checked').val() || 'online';

    // Get the product details from the table
    const items = [];

    // Check if there are detail rows in the table
    const detailRows = $('#table_detail tbody tr.detail-row');

    if (detailRows.length > 0) {
        detailRows.each(function () {
            const row = $(this);

            // Extract data from the row
            const productId = row.find('input[name="id_product_detail[]"]').val();
            const productName = row.find('input[name="product_name_detail[]"]').val();
            const productCode = row.find('input[name="product_barcode_detail[]"]').val();
            const quantity = parseFloat(row.find('input[name="quantity_detail[]"]').val()) || 0;
            const notes = row.find('input[name="notes_detail[]"]').val() || '';

            items.push({
                product_id: productId,
                product_name: productName,
                product_code: productCode,
                quantity: quantity,
                scheduled_date: endDate,
                notes: notes
            });
        });
    }

    // Calculate totals
    let totalQty = 0;
    let totalHpp = 0;

    // Sum up quantities from all rows
    $('input[name="quantity_detail[]"]').each(function () {
        totalQty += parseFloat($(this).val()) || 0;
    });

    // Get HPP if available
    const hppBahanBaku = parseFloat($('#hpp_bahan_baku').val()) || 0;
    totalHpp = totalQty * hppBahanBaku;

    // Update the hidden inputs
    $('#totalQtyInput').val(totalQty);
    $('#total_amount_input').val(totalHpp);

    console.log("Items to submit:", items);
    console.log("Total Qty:", totalQty);
    console.log("Total HPP:", totalHpp);

    return {
        code: document.getElementById('code').value,
        date: startDate,
        planned_date: endDate,
        total_qty: totalQty,
        total_hpp: totalHpp,
        type: type,
        note: document.getElementById('note').value,
        items: items
    };
}

function handleSubmissionSuccess(result) {
    Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'SPK Produksi berhasil dibuat dan menunggu persetujuan.',
        confirmButtonText: 'OK'
    }).then(() => {
        // Redirect to the production plan list page
        window.location.href = '/admin/manufacture/planmanufakture';
    });
}

function showErrorAlert(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}