// Purchase Create Script
document.addEventListener('DOMContentLoaded', function () {
    initializeComponents();
    loadProductionPlanDetails();
});

// Initialize all components
function initializeComponents() {
    initializeSelect2();
    initializeFormValidation();
}

function loadProductionPlanDetails() {
    // Ambil ID dari URL
    const pathSegments = window.location.pathname.split('/');
    const planId = pathSegments[pathSegments.length - 1];
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    $.ajax({
        url: `/api/v1/plan-manufacture/${planId}/details`,
        type: 'GET',
        headers: {
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
        },
        success: function (response) {
            if (response.success) {

                const plan = response.plan;
                const details = response.plan_details;
                const bomDetails = response.bom_details;
                const processes = response.processes;
                const materials = response.materials;
                const spec = response.spec;

                // Isi informasi utama
                $('#plan-code').text(plan.code);
                $('#plan-date').text(plan.date);
                $('#plan-production-date').text(plan.planned_date);
                $('#plan-machine').text(plan.machine_name || 'N/A');
                $('#plan-total-qty').text(plan.total_qty);
                $('#plan-total-hpp').text('Rp. ' + formatNumber(plan.total_hpp));
                $('#plan-status').text(plan.status);

                // Populate Detail Artikel
                populateArticleDetails(details);

                // Populate Komponen (BOM)
                populateBOMDetails(bomDetails);

                // Populate Proses
                populateProcessDetails(processes);

                // Populate Bahan Baku
                populateMaterialDetails(spec);

                // Populate spesifikasi
                populateSpecDetails(spec);

            } else {
                showErrorToast('Data perencanaan produksi tidak ditemukan!');
            }
        },
        error: function (xhr, status, error) {
            console.error('Error loading production plan data:', error);
            showErrorToast('Gagal memuat data perencanaan produksi: ' + error);
        }
    });
}

function populateArticleDetails(details) {
    const tableBody = $('#detail-artikel-table tbody');
    tableBody.empty();

    details.forEach(detail => {
        tableBody.append(`
            <tr>
                <td class="text-center">${detail.product_name}</td>
                <td class="text-center">${detail.product_barcode}</td>
                <td class="text-center">${formatNumber(detail.quantity)}</td>
                <td class="text-center">${formatDate(detail.scheduled_date)}</td>
                <td class="text-center">${detail.notes || '-'}</td>
            </tr>
        `);
    });
}

function populateBOMDetails(bomDetails) {
    const tableBody = $('#table_component tbody');
    tableBody.empty();

    if (bomDetails.length === 0) {
        return;
    }

    let grandTotalLs = 0;

    // Tambahkan detail komponen
    bomDetails.forEach(detail => {
        const quantity = detail.quantity || '-';
        const color = detail.color || '-';
        const size = detail.size || '-';

        tableBody.append(`
            <tr class="detailkomponen-row" data-product-id="${detail.id}">
                <input type="hidden" name="existing_component_id[]" value="${detail.id}">
                <td class="align-middle text-center" style="display:none;">
                    <input type="text" name="id_product_bom_detail[]" class="form-control product_id" value="${detail.product_id}" readonly>
                </td>
                <td class="align-middle text-center" style="width: 220px;">
                    <input type="hidden" class="form-control" name="product_name_bom_detail[]" value="${detail.name}" readonly>
                    ${detail.name}
                </td>
                <td class="align-middle text-center">
                    <input type="hidden" class="form-control" name="color_bom_detail[]" value="${color}" readonly>
                    ${color}
                </td>
                <td class="align-middle text-center">
                    <input type="hidden" class="form-control" name="size_bom_detail[]" value="${size}" readonly>
                    ${size}
                </td>
                <td class="align-middle text-center">
                    <input type="hidden" class="form-control" name="quantity_bom_detail[]" value="${quantity}" readonly>
                    <span class="badge-light-info">${quantity}</span>
                </td>
                <td class="align-middle text-center">
                    <input type="hidden" class="form-control" name="uom_bom_detail[]" value="${detail.uom}" readonly>
                    ${detail.uom}
                </td>
                <td class="align-middle text-center">
                    <input type="hidden" class="form-control" name="price_per_unit_bom_detail[]" value="${detail.price_buy_unit}" readonly>
                    Rp. ${detail.price_per_unit}
                </td>
                <td class="align-middle text-center">
                    <button disabled type="button" class="btn btn-danger btn-remove-detail">
                        <i class="ph-trash"></i>
                    </button>
                </td>
            </tr>
        `);

        // Akumulasi total harga per lusin
        const totalPriceLusin = detail.price_buy_unit;
        grandTotalLs += totalPriceLusin;
    });

    // Ambil detail terakhir untuk biaya produksi dan marketing
    const lastDetail = bomDetails[bomDetails.length - 1];

    // Tambahkan baris Biaya Produksi
    tableBody.append(`
        <tr class="detailkomponen-row">
            <td class="text-center" style="width: 220px;">Biaya Produksi</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
            <td class="text-center">
                <input type="hidden" class="form-control" name="production_cost[]" value="${lastDetail.production_cost}" readonly>
                Rp. ${formatNumber(lastDetail.production_cost)}
            </td>
            <td class="align-middle text-center">
                <button disabled type="button" class="btn btn-danger btn-remove-item">
                    <i class="ph-trash"></i>
                </button>
            </td>
        </tr>
    `);

    // Tambahkan baris Biaya Marketing
    tableBody.append(`
        <tr class="detailkomponen-row">
            <td class="text-center" style="width: 220px;">Biaya Marketing (Rak)</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
            <td class="text-center">
                <input type="hidden" class="form-control" name="marketing_cost[]" value="${lastDetail.marketing_cost}" readonly>
                Rp. ${formatNumber(lastDetail.marketing_cost)}
            </td>
            <td class="align-middle text-center">
                <button disabled type="button" class="btn btn-danger btn-remove-item">
                    <i class="ph-trash"></i>
                </button>
            </td>
        </tr>
    `);

    // HPP per Lusin
    tableBody.append(`
        <tr>
            <td colspan="5" class="text-right"><strong>Hpp / Lusin :</strong></td>
            <td colspan="2" class="text-center">
                <input type="hidden" class="form-control" id="hpp_bahan_baku" name="hpp_bahan_baku" value="${lastDetail.hpp}" readonly>
                <strong>Rp. ${formatNumber(lastDetail.hpp)} (ls)</strong>
            </td>
        </tr>
    `);
}

function populateProcessDetails(processes) {
    const tableBody = $('#table_process tbody');
    tableBody.empty();

    processes.forEach(process => {
        tableBody.append(`
            <tr class="detailkomponen-row" data-id_process="${process.id_process}">
                <td class="align-middle text-center" style="width: 80%;">${process.name}</td>
                <td class="text-center" style="width: 20%;">✅</td>
            </tr>
        `);
    });
}

function populateSpecDetails(spec) {
    if (spec && spec.length > 0) {
        // Get the first object from the array
        const specData = spec[0];
        
        // Karet
        document.getElementById('karet_1_panjang').value = 
            (specData.karet_1_panjang_HT_168 && specData.karet_1_panjang_HT_168 !== '0.00') 
                ? specData.karet_1_panjang_HT_168 
                : (specData.karet_1_panjang_DK_168 || '');
                
        document.getElementById('karet_1_putaran').value = 
            (specData.karet_1_putaran_HT_168 && specData.karet_1_putaran_HT_168 !== '0.00') 
                ? specData.karet_1_putaran_HT_168 
                : (specData.karet_1_putaran_DK_168 || '');
                
        document.getElementById('karet_1_lebar').value = 
            (specData.karet_1_lebar_HT_168 && specData.karet_1_lebar_HT_168 !== '0.00') 
                ? specData.karet_1_lebar_HT_168 
                : (specData.karet_1_lebar_DK_168 || '');
                
        document.getElementById('tarikan_karet').value = 
            (specData.karet_1_tarikan_HT_168 && specData.karet_1_tarikan_HT_168 !== '0.00') 
                ? specData.karet_1_tarikan_HT_168 
                : (specData.karet_1_tarikan_DK_168 || '');
        
        // Bodi 1
        document.getElementById('body_1_panjang').value = 
            (specData.body_1_panjang_HT_168 && specData.body_1_panjang_HT_168 !== '0.00') 
                ? specData.body_1_panjang_HT_168 
                : (specData.body_1_panjang_DK_168 || '');
                
        document.getElementById('body_1_putaran').value = 
            (specData.body_1_putaran_HT_168 && specData.body_1_putaran_HT_168 !== '0.00') 
                ? specData.body_1_putaran_HT_168 
                : (specData.body_1_putaran_DK_168 || '');
                
        document.getElementById('body_1_lebar').value = 
            (specData.body_1_lebar_HT_168 && specData.body_1_lebar_HT_168 !== '0.00') 
                ? specData.body_1_lebar_HT_168 
                : (specData.body_1_lebar_DK_168 || '');
                
        document.getElementById('body_1_tarikan').value = 
            (specData.body_1_tarikan_HT_168 && specData.body_1_tarikan_HT_168 !== '0.00') 
                ? specData.body_1_tarikan_HT_168 
                : (specData.body_1_tarikan_DK_168 || '');
        
        // Bodi 2
        document.getElementById('body_2_panjang').value = 
            (specData.body_2_panjang_HT_168 && specData.body_2_panjang_HT_168 !== '0.00') 
                ? specData.body_2_panjang_HT_168 
                : (specData.body_2_panjang_DK_168 || '');
                
        document.getElementById('body_2_putaran').value = 
            (specData.body_2_putaran_HT_168 && specData.body_2_putaran_HT_168 !== '0.00') 
                ? specData.body_2_putaran_HT_168 
                : (specData.body_2_putaran_DK_168 || '');
                
        document.getElementById('body_2_lebar').value = 
            (specData.body_2_lebar_HT_168 && specData.body_2_lebar_HT_168 !== '0.00') 
                ? specData.body_2_lebar_HT_168 
                : (specData.body_2_lebar_DK_168 || '');
                
        document.getElementById('body_2_tarikan').value = 
            (specData.body_2_tarikan_HT_168 && specData.body_2_tarikan_HT_168 !== '0.00') 
                ? specData.body_2_tarikan_HT_168 
                : (specData.body_2_tarikan_DK_168 || '');
    }
}

// Helper function to add a material row
function addMaterialRow(tableBody, type, color, quantity) {
    const row = `
        <tr class="detailMaterial-row">
            <td class="text-center">${type}</td>
            <td class="text-center">${color || '-'}</td>
            <td class="text-center">${quantity || '0'}</td>
            <td class="text-center" style="display: none;">
                <span class="badge bg-success">Tersedia</span>
            </td>
        </tr>
    `;
    tableBody.append(row);
}

// Helper function to add conditional material row
function addConditionalMaterialRow(tableBody, type, color, quantity) {
    if (color !== null && color !== undefined && color !== '') {
        addMaterialRow(tableBody, type, color, quantity);
    }
}

function populateMaterialDetails(bomMaterial) {
    const tableBody = $('#bahanDasarTable tbody');
    tableBody.empty();

    if (!bomMaterial || bomMaterial.length === 0) {
        tableBody.html('<tr><td colspan="4" class="text-center">Tidak ada data bahan baku</td></tr>');
        return;
    }

    // Iterasi setiap baris material
    bomMaterial.forEach(value => {
        // Spandex 1
        addMaterialRow(tableBody, 'SPANDEX', value.spandex_1, value.qty_spandex_1);

        // Spandex 2 (jika ada)
        if (value.spandex_2 !== null) {
            addMaterialRow(tableBody, 'SPANDEX', value.spandex_2, value.qty_spandex_2);
        }

        // Karet
        addMaterialRow(tableBody, 'KARET', value.karet, value.qty_karet);

        // Material tambahan dengan kondisional
        addConditionalMaterialRow(tableBody, 'NYLON', value.nylon_1, value.qty_nylon_1);
        addConditionalMaterialRow(tableBody, 'PE', value.pe_1, value.qty_pe_1);
        addConditionalMaterialRow(tableBody, 'PE', value.pe_2, value.qty_pe_2);
        addConditionalMaterialRow(tableBody, 'PE', value.pe_3, value.qty_pe_3);
        addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_1, value.qty_nylon_skc_1);
        addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_2, value.qty_nylon_skc_2);
        addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_3, value.qty_nylon_skc_3);
        addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_4, value.qty_nylon_skc_4);
    });
}

// function populateMaterialDetails(bomMaterial) {
//     const tableBody = $('#bahanDasarTable tbody');
//     tableBody.empty();

//     if (bomMaterial.length === 0) {
//         return;
//     }

//     // Iterasi setiap baris material
//     bomMaterial.forEach(value => {
//         // Spandex 1
//         addMaterialRow(tableBody, 'SPANDEX', value.spandex_1, value.qty_spandex_1);

//         // Spandex 2 (jika ada)
//         if (value.spandex_2 !== null) {
//             addMaterialRow(tableBody, 'SPANDEX', value.spandex_2, value.qty_spandex_2);
//         }

//         // Karet
//         addMaterialRow(tableBody, 'KARET', value.karet, value.qty_karet);

//         // Material tambahan dengan kondisional
//         addConditionalMaterialRow(tableBody, 'NYLON', value.nylon_1, value.qty_nylon_1);
//         addConditionalMaterialRow(tableBody, 'PE', value.pe_1, value.qty_pe_1);
//         addConditionalMaterialRow(tableBody, 'PE', value.pe_2, value.qty_pe_2);
//         addConditionalMaterialRow(tableBody, 'PE', value.pe_3, value.qty_pe_3);
//         addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_1, value.qty_nylon_skc_1);
//         addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_2, value.qty_nylon_skc_2);
//         addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_3, value.qty_nylon_skc_3);
//         addConditionalMaterialRow(tableBody, 'NYLON SKC', value.nylon_skc_4, value.qty_nylon_skc_4);
//     });
// }

// // Fungsi untuk menambahkan baris material
// function addMaterialRow(tableBody, type, color, quantity) {
//     tableBody.append(`
//         <tr class="detailMaterial-row">
//             <td>
//                 <input type="text" class="form-control" disabled name="jenis[]" value="${type}">
//             </td>
//             <td>
//                 <input type="text" class="form-control" disabled name="warna[]" value="${color || '-'}" placeholder="Warna">
//             </td>
//             <td>
//                 <input type="number" class="form-control" disabled name="jumlah[]" value="${quantity || 0}">
//             </td>
//             <td class="text-center">
//                 <button type="button" class="btn btn-danger remove-bahan" disabled>
//                     <i class="ph-trash ph-sm"></i>
//                 </button>
//             </td>
//         </tr>
//     `);
// }

// // Fungsi untuk menambahkan material bersyarat
// function addConditionalMaterialRow(tableBody, type, color, quantity) {
//     if (color !== null) {
//         addMaterialRow(tableBody, type, color, quantity);
//     }
// }

// Utility functions

function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showErrorToast(message) {
    // Implementasi sesuai library toast yang digunakan
    toastr.error(message);
}

function initializeSelect2() {
    // Initialize supplier select2
    const customerSelect = $('#id_cust');
    customerSelect.select2({
        placeholder: 'Pilih Pelanggan',
        allowClear: true
    });

    // Handle supplier change
    customerSelect.on('change', function () {
        const selectedCustomerId = $(this).val();
        if (selectedCustomerId) {
            $.ajax({
                url: getCustomer,
                type: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                data: {
                    idcust: selectedCustomerId
                },
                dataType: 'json',
                success: function (response) {
                    if (response.success) {
                        // Fill customer details
                        $('#cust_name').val(response.data.nama);
                        $('#address_name').val(response.data.alamat);
                        $('#kel').val(response.data.kelurahan);
                        $('#kec').val(response.data.kecamatan);
                        $('#kota_kab').val(response.data.idkota);
                        $('#provinsi').val(response.data.provinsi);

                        // Get current transaction type
                        const currentTransType = $('#j_transaksi').val();

                        // Set discount if transaction type is selected
                        if (currentTransType && response.discounts) {
                            const discountValue = response.discounts[currentTransType] || 0;
                            $('#discount_percentage').val(discountValue).trigger('input');
                            $('#discount_percentage_disp').text(discountValue);
                        }
                    } else {
                        Swal.fire({
                            text: 'Data pelanggan tidak ditemukan!',
                            icon: 'warning',
                            toast: true,
                            showConfirmButton: false,
                            position: 'top-end',
                            timer: 3000
                        });
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error:', error);
                    Swal.fire({
                        text: 'Gagal mengambil data pelanggan!',
                        icon: 'error',
                        toast: true,
                        showConfirmButton: false,
                        position: 'top-end',
                        timer: 3000
                    });
                }
            });
        }
    });

    // Add handler for transaction type changes
    $('#j_transaksi').on('change', function () {
        const selectedCustomerId = $('#id_cust').val();
        const selectedTransType = $(this).val();

        if (selectedCustomerId && selectedTransType) {
            // Re-fetch customer data to get discounts
            $.ajax({
                url: getCustomer,
                type: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                data: {
                    idcust: selectedCustomerId
                },
                dataType: 'json',
                success: function (response) {
                    if (response.success && response.discounts) {
                        const discountValue = response.discounts[selectedTransType] || 0;
                        $('#discount_percentage').val(discountValue).trigger('input');
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error fetching customer discounts:', error);
                }
            });
        }
    });
}

// validasi input
function initializeFormValidation() {
    $("#verify-plan-form").on('submit', validateFormSubmission);

    const form = document.getElementById('verify-plan-form');

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
}

function validateFormSubmission(e) {
    e.preventDefault(); // Hentikan submit default

    let isValid = true;
    let errors = [];

    // Validasi items
    if (cartState.items.length === 0) {
        errors.push('Artikel belum di Scan! Silakan tambahkan artikel terlebih dahulu.');
        isValid = false;
    }

    // Tampilkan error jika ada
    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    // Jika valid, submit form dengan AJAX
    submitForm();
    return false;
}

// Utility functions
function formatMoney(amount) {
    // Ensure amount is a number
    const cleanAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cleanAmount);
}