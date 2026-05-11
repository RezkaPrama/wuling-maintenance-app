document.addEventListener('DOMContentLoaded', function () {

    if (!document.getElementById('product-modal-styles')) {
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }

    initializeComponents();
    initializeEventListeners();
    showEmptyCartMessage();
    generateInvoiceNumber();
});

// Global state for cart
const cartState = {
    invoiceNumber: '',
    items: [],
    tax: 0,
    hpp: 0,
    bruto: 0,
    discount1: 0,
    discount2: 0,
    discount3: 0,
    netto: 0,
    barcodeBuffer: '',
    barcodeTimer: null,
    lastKeypressTime: 0,
    totalPack: 0,
    totalPasang: 0,  // TAMBAHKAN INI
    scanMode: 'pack'
};

// Global variable untuk modal state
let productSearchModal = null;
let productSearchTimeout = null;
let scanQueue = [];
let isProcessing = false;
let pendingScans = 0;

// Initialize all components
function initializeComponents() {
    initializeSelect2();
    initializeFormValidation();
}

function generateInvoiceNumber() {
    $.ajax({
        url: generateSendNumberUrl,
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        dataType: 'json',
        success: function (response) {
            cartState.invoiceNumber = response.no_faktur;
            $('#no_faktur').val(response.no_faktur);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            Swal.fire({
                text: 'Gagal generate nomor faktur',
                icon: 'error',
                toast: true,
                showConfirmButton: false,
                position: 'top-end',
                timer: 3000
            });
        }
    });
}

function initializeSelect2() {
    // Initialize customer select2
    const customerSelect = $('#id_cust');
    customerSelect.select2({
        placeholder: 'Pilih Pelanggan',
        allowClear: true
    });

    // Handle customer change
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

                        // Set default discount if available
                        if (response.discounts) {
                            const defaultDiscount = response.discounts.default || 0;
                            $('#discount_percentage').val(defaultDiscount).trigger('input');
                            $('#discount_percentage_disp').text(defaultDiscount);
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
}

// validasi input
function initializeFormValidation() {
    $("#send-online-form").on('submit', validateFormSubmission);

    const form = document.getElementById('send-online-form');
    const inputs = form.querySelectorAll('input, textarea, select'); // Ambil semua input, textarea, dan select

    inputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.value.trim()) { // Cek jika input tidak kosong
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
                this.classList.add('is-invalid');
            }
        });
    });
}

// function initializeFormValidation() {
//     $("#send-online-form").on('submit', validateFormSubmission);

//     const form = document.getElementById('send-online-form');

//     // Add custom validation classes and feedback elements
//     const requiredInputs = form.querySelectorAll('[required]');
//     requiredInputs.forEach(input => {
//         input.addEventListener('change', function () {
//             if (this.value) {
//                 this.classList.remove('is-invalid');
//                 this.classList.add('is-valid');
//             } else {
//                 this.classList.remove('is-valid');
//                 this.classList.add('is-invalid');
//             }
//         });
//     });
// }

function validateFormSubmission(e) {
    e.preventDefault(); // Hentikan submit default

    let isValid = true;
    let errors = [];

    // Validasi items
    if (cartState.items.length === 0) {
        errors.push('Artikel belum di Scan! Silakan tambahkan artikel terlebih dahulu.');
        isValid = false;
    }

    // Removed validation for j_transaksi since it's no longer needed

    // Tampilkan error jika ada
    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    // Jika valid, submit form dengan AJAX
    submitForm();
    return false;
}

function initializeEventListeners() {
    // ============ TAMBAHKAN INI ============
    // Initialize F1 Product Search
    initializeF1ProductSearch();
    // =======================================

    $("#product-search").on('keypress', handleBarcodeInput);

    $("#product-search").on('keyup', handleBarcodeScanner);

    $("#discount_percentage").on('input', updateDiscounts);
    $("#discount_percentage2").on('input', updateDiscounts);
    $("#discount_percentage3").on('input', updateDiscounts);

    // TAMBAHKAN INI - Handle scan mode toggle
    $('input[name="scan_mode"]').on('change', function () {
        cartState.scanMode = $(this).val();
        updateScanModeIndicator();
    });
}

// TAMBAHKAN FUNCTION INI
function updateScanModeIndicator() {
    const mode = cartState.scanMode === 'pack' ? 'PACK' : 'PASANG';
    const color = cartState.scanMode === 'pack' ? 'primary' : 'success';

    if ($('#scan-mode-indicator').length === 0) {
        $('#product-search').before(`
            <div id="scan-mode-indicator" class="alert alert-${color} py-2 mb-2">
                Mode: <strong>${mode}</strong>
            </div>
        `);
    } else {
        $('#scan-mode-indicator')
            .removeClass('alert-primary alert-success')
            .addClass(`alert-${color}`)
            .html(`Mode: <strong>${mode}</strong>`);
    }
}

// ============ ADD CSS STYLES ============
// Tambahkan CSS untuk modal styling
const modalStyles = `
<style id="product-modal-styles">
    #productSearchModal .product-item {
        transition: all 0.2s ease;
        border-left: 3px solid transparent;
    }
    
    #productSearchModal .product-item:hover {
        background-color: #f8f9fa;
        border-left-color: #0d6efd;
        transform: translateX(5px);
    }
    
    #productSearchModal .product-item:active {
        background-color: #e9ecef;
    }
    
    #modal-products-list::-webkit-scrollbar {
        width: 8px;
    }
    
    #modal-products-list::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }
    
    #modal-products-list::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }
    
    #modal-products-list::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
    
    #modal-product-search {
        border: 2px solid #dee2e6;
        transition: border-color 0.3s ease;
    }
    
    #modal-product-search:focus {
        border-color: #0d6efd;
        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }
</style>
`;

function handleBarcodeInput(e) {
    if (e.which == 13) { // Enter key pressed
        e.preventDefault();
        const barcode = $(this).val().trim();
        if (barcode) {
            searchProductByBarcode(barcode);
        }
    }
}

function handleBarcodeScanner(e) {
    const currentTime = new Date().getTime();
    const keyCode = e.which;

    // If this is a rapid sequence of keypresses (typical of barcode scanners)
    if (currentTime - cartState.lastKeypressTime < 50 && keyCode >= 32 && keyCode <= 126) {
        // Clear existing timer
        if (cartState.barcodeTimer) {
            clearTimeout(cartState.barcodeTimer);
        }

        // Add character to buffer
        cartState.barcodeBuffer += String.fromCharCode(keyCode);

        // Set new timer - process buffer after 50ms of inactivity
        cartState.barcodeTimer = setTimeout(() => {
            if (cartState.barcodeBuffer.length >= 5) { // Min barcode length
                searchProductByBarcode(cartState.barcodeBuffer);
                $("#product-search").val('');
            }
            cartState.barcodeBuffer = '';
        }, 50);
    } else {
        // Reset buffer if this is manual typing (slow input)
        cartState.barcodeBuffer = '';
    }

    cartState.lastKeypressTime = currentTime;
}

function searchProductByBarcode(barcode) {
    showLoader();

    // Fix the API endpoint path - ensure it starts with a leading slash
    const apiUrl = `/api/v1/products/findByBarcode/${barcode}`;

    $.ajax({
        url: apiUrl,
        type: 'GET',
        success: handleProductSearchSuccess,
        error: handleProductSearchError
    });
}

function handleProductSearchSuccess(response) {
    hideLoader();
    if (response.success) {
        addProductToCart(response.product);
        // Clear search input and focus back
        $("#product-search").val('').focus();
    } else {
        toastr.error(response.message || 'Product not found');
        $("#product-search").select();
    }
}

function handleProductSearchError(xhr, status, error) {
    hideLoader();
    console.error("API Error:", xhr, status, error);

    let errorMessage = 'Error searching for product';
    if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage = xhr.responseJSON.message;
    }

    toastr.error(errorMessage);
    $("#product-search").select();
}

// Show loading spinner
function showLoader() {
    $("#search-results").html('<div class="d-flex justify-content-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>');
}

// Hide loading spinner
function hideLoader() {
    $("#search-results").html('');
}

function addProductToCart(product) {
    const price = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
    const hpp = parseFloat(product.price?.toString().replace(/[^\d.-]/g, '')) || 0;

    const existingItemIndex = cartState.items.findIndex(item => item.id_product === product.id);

    if (existingItemIndex !== -1) {
        const existingItem = cartState.items[existingItemIndex];

        // UPDATE INI - tambahkan kondisi berdasarkan scan mode
        if (cartState.scanMode === 'pack') {
            existingItem.qty += 1;
        } else {
            existingItem.qty_pcs = (existingItem.qty_pcs || 0) + 1;
        }

        existingItem.subtotal = (existingItem.qty * price) + ((existingItem.qty_pcs || 0) * price);
        existingItem.hpp_total = (existingItem.qty * hpp) + ((existingItem.qty_pcs || 0) * hpp);

        updateCartRow(existingItem);
        playSuccessSound();
    } else {
        const newItem = {
            id_product: product.id,
            barcode: product.barcode,
            product_name: product.name,
            price_sell: product.price_sell,
            quantity: product.quantity,
            price_pcs: price,
            hpp_pcs: hpp,
            qty: cartState.scanMode === 'pack' ? 1 : 0,  // UPDATE INI
            qty_pcs: cartState.scanMode === 'pasang' ? 1 : 0,  // TAMBAHKAN INI
            subtotal: price,
            hpp_total: hpp
        };

        cartState.items.push(newItem);
        addCartRow(newItem);
        playSuccessSound();
    }

    updateCartSummary();
    sortCartTable();
}

// Optional: Play a beep sound for successful scan
function playSuccessSound() {
    // Create an AudioContext if browser supports it
    if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 1800;
        gainNode.gain.value = 0.5;

        oscillator.start();
        setTimeout(() => oscillator.stop(), 80);
    }
}

// Stars: Add & update to detail table
function addCartRow(item) {
    $("#empty-cart-row").remove();

    const newRow = `
        <tr id="cart-item-${item.id_product}" class="new-item-highlight">
            <td class="align-middle text-center">${item.barcode}</td>
            <td class="align-middle text-center">${item.product_name}</td>
            <td class="align-middle text-center">${item.quantity}</td>
            <td class="align-middle text-end">${formatMoney(item.price_sell)}</td>
            
            <!-- Kolom Jumlah Pack -->
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text btn btn-sm btn-secondary qty-decrease" data-product-id="${item.id_product}">-</span>
                    <input type="number" class="form-control text-center product-qty" data-product-id="${item.id_product}" 
                    value="${item.qty || 0}" min="0" style="width: 60px;">
                    <span class="input-group-text btn btn-sm btn-secondary qty-increase" data-product-id="${item.id_product}">+</span>
                </div>
            </td>
            
            <!-- TAMBAHKAN KOLOM JUMLAH PASANG -->
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text btn btn-sm btn-secondary qty-decrease-pcs" data-product-id="${item.id_product}">-</span>
                    <input type="number" class="form-control text-center product-qty-pcs" data-product-id="${item.id_product}" 
                    value="${item.qty_pcs || 0}" min="0" style="width: 60px;">
                    <span class="input-group-text btn btn-sm btn-secondary qty-increase-pcs" data-product-id="${item.id_product}">+</span>
                </div>
            </td>
            
            <td class="align-middle text-end subtotal-value">${formatMoney(item.subtotal)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger remove-item" data-product-id="${item.id_product}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
            
            <!-- Hidden inputs -->
            <input type="hidden" name="products[${item.id_product}][id_product]" value="${item.id_product}">
            <input type="hidden" name="products[${item.id_product}][barcode]" value="${item.barcode}">
            <input type="hidden" name="products[${item.id_product}][product_name]" value="${item.product_name}">
            <input type="hidden" name="products[${item.id_product}][qty]" value="${item.qty}">
            <input type="hidden" name="products[${item.id_product}][qty_pcs]" value="${item.qty_pcs || 0}">
            <input type="hidden" name="products[${item.id_product}][quantity]" value="${item.quantity}">
            <input type="hidden" name="products[${item.id_product}][price_pack]" value="${item.price_sell}">
            <input type="hidden" name="products[${item.id_product}][subtotal]" value="${item.subtotal}">
            <input type="hidden" name="products[${item.id_product}][hpp_pcs]" value="${item.hpp_pcs}">
            <input type="hidden" name="products[${item.id_product}][hpp_total]" value="${item.hpp_total}">
        </tr>
    `;

    $("#cart-body").append(newRow);
    setTimeout(() => $(`#cart-item-${item.id_product}`).removeClass('new-item-highlight'), 2000);
    attachCartEvents(item.id_product);
    setTimeout(() => $("#product-search").focus(), 100);
}

// Update existing cart row
function updateCartRow(item) {
    const row = $(`#cart-item-${item.id_product}`);

    // Update values
    row.find('.product-qty').val(item.qty || 0);
    row.find('.product-qty-pcs').val(item.qty_pcs || 0);  // TAMBAHKAN INI
    row.find('.subtotal-value').text(`${formatMoney(item.subtotal)}`);
    
    // Update hidden inputs
    row.find(`input[name="products[${item.id_product}][qty]"]`).val(item.qty);
    row.find(`input[name="products[${item.id_product}][qty_pcs]"]`).val(item.qty_pcs || 0);  // TAMBAHKAN INI
    row.find(`input[name="products[${item.id_product}][subtotal]"]`).val(item.subtotal);
    row.find(`input[name="products[${item.id_product}][hpp_total]"]`).val(item.hpp_total);

    // Highlight the updated row
    row.addClass('updated-item-highlight');

    // Scroll to the updated row
    scrollToElement(`#cart-item-${item.id_product}`);

    // Remove highlight after animation
    setTimeout(() => {
        row.removeClass('updated-item-highlight');
    }, 2000);

    // Refocus on barcode input
    setTimeout(() => {
        $("#product-search").focus();
    }, 100);
}
// End: Add & update to detail table

// Scroll to element helper
function scrollToElement(selector) {
    const element = $(selector)[0];
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function attachCartEvents(productId) {
    // Pack quantity controls
    $(`.qty-increase[data-product-id="${productId}"]`).on('click', function () {
        increaseItemQuantity(productId, 'pack');
        return false;
    });

    $(`.qty-decrease[data-product-id="${productId}"]`).on('click', function () {
        decreaseItemQuantity(productId, 'pack');
        return false;
    });

    $(`.product-qty[data-product-id="${productId}"]`).on('change', function () {
        updateItemQuantity(productId, parseInt($(this).val()) || 0, 'pack');
    });

    // ============ TAMBAHKAN INI - Pasang quantity controls ============
    $(`.qty-increase-pcs[data-product-id="${productId}"]`).on('click', function () {
        increaseItemQuantity(productId, 'pasang');
        return false;
    });

    $(`.qty-decrease-pcs[data-product-id="${productId}"]`).on('click', function () {
        decreaseItemQuantity(productId, 'pasang');
        return false;
    });

    $(`.product-qty-pcs[data-product-id="${productId}"]`).on('change', function () {
        updateItemQuantity(productId, parseInt($(this).val()) || 0, 'pasang');
    });
    // ==================================================================

    // Remove item button
    $(`.remove-item[data-product-id="${productId}"]`).on('click', function () {
        removeCartItem(productId);
        return false;
    });
}

// Increase item quantity
function increaseItemQuantity(productId, type = 'pack') {
    const itemIndex = cartState.items.findIndex(item => item.id_product === productId);
    if (itemIndex !== -1) {
        const item = cartState.items[itemIndex];

        if (type === 'pack') {
            item.qty += 1;
        } else {
            item.qty_pcs = (item.qty_pcs || 0) + 1;
        }

        item.subtotal = (item.qty * item.price_pcs) + ((item.qty_pcs || 0) * item.price_pcs);
        item.hpp_total = (item.qty * item.hpp_pcs) + ((item.qty_pcs || 0) * item.hpp_pcs);

        updateCartRow(item);
        updateCartSummary();
    }
}

// Decrease item quantity
function decreaseItemQuantity(productId, type = 'pack') {
    const itemIndex = cartState.items.findIndex(item => item.id_product === productId);
    if (itemIndex !== -1) {
        const item = cartState.items[itemIndex];

        if (type === 'pack' && item.qty > 0) {
            item.qty -= 1;
        } else if (type === 'pasang' && (item.qty_pcs || 0) > 0) {
            item.qty_pcs -= 1;
        }

        item.subtotal = (item.qty * item.price_pcs) + ((item.qty_pcs || 0) * item.price_pcs);
        item.hpp_total = (item.qty * item.hpp_pcs) + ((item.qty_pcs || 0) * item.hpp_pcs);

        updateCartRow(item);
        updateCartSummary();
    }
}

function updateItemQuantity(productId, newQty, type = 'pack') {
    const qty = Math.max(0, newQty);
    const itemIndex = cartState.items.findIndex(item => item.id_product === productId);

    if (itemIndex !== -1) {
        const item = cartState.items[itemIndex];

        if (type === 'pack') {
            item.qty = qty;
        } else {
            item.qty_pcs = qty;
        }

        item.subtotal = (item.qty * item.price_pcs) + ((item.qty_pcs || 0) * item.price_pcs);
        item.hpp_total = (item.qty * item.hpp_pcs) + ((item.qty_pcs || 0) * item.hpp_pcs);

        updateCartRow(item);
        updateCartSummary();
    }
}

// Remove item from cart
function removeCartItem(productId) {
    // Remove from state
    cartState.items = cartState.items.filter(item => item.id_product !== productId);

    // Remove from DOM
    $(`#cart-item-${productId}`).fadeOut(300, function () {
        $(this).remove();

        // Show empty cart message if needed
        if (cartState.items.length === 0) {
            showEmptyCartMessage();
        }

        updateCartSummary();

        // Refocus on barcode input
        $("#product-search").focus();
    });
}

function updateCartSummary() {
    cartState.hpp = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.hpp_total) || 0);
    }, 0);

    cartState.bruto = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
    }, 0);

    cartState.totalPack = cartState.items.reduce((sum, item) => {
        return sum + (parseInt(item.qty) || 0);
    }, 0);

    // TAMBAHKAN INI
    cartState.totalPasang = cartState.items.reduce((sum, item) => {
        return sum + (parseInt(item.qty_pcs) || 0);
    }, 0);

    $("#total-pack").text(cartState.totalPack);
    $("#total-pasang").text(cartState.totalPasang);  // TAMBAHKAN INI
    $("#total_pack").val(cartState.totalPack);
    $("#total_pasang").val(cartState.totalPasang);  // TAMBAHKAN INI
    $("#total-amount").text(formatMoney(cartState.bruto));

    updateDiscounts();
}

// Set total amount to paid amount
function setTotalAmountToPaid() {
    $("#paid_amount").val(cartState.totalAmount);
}

// Show empty cart message
function showEmptyCartMessage() {
    $("#cart-body").html(`
        <tr id="empty-cart-row">
            <td colspan="8" class="text-center">
                <div class="alert alert-warning">
                    Cari dan Pilih Bahan Baku terlebih dahulu
                </div>
            </td>
        </tr>
    `);
}

function sortCartTable() {
    const rows = $("#cart-body tr").not("#empty-cart-row").get();

    rows.sort(function (a, b) {
        const nameA = $(a).find('td:eq(1)').text().toUpperCase();
        const nameB = $(b).find('td:eq(1)').text().toUpperCase();
        return nameA.localeCompare(nameB);
    });

    $.each(rows, function (index, row) {
        $("#cart-body").append(row);
    });
}

// Start : Kalkulasi Total
function updateDiscounts() {
    const disc1Percentage = parseFloat($("#discount_percentage").val()) || 0;
    const disc2Percentage = parseFloat($("#discount_percentage2").val()) || 0;
    const disc3Percentage = parseFloat($("#discount_percentage3").val()) || 0;
    const disc3Amount = parseFloat($("#discount_percentage3").val()) || 0;

    // Calculate discounts
    cartState.discount1 = (cartState.bruto * disc1Percentage) / 100;
    const afterDisc1 = cartState.bruto - cartState.discount1;

    cartState.discount2 = (afterDisc1 * disc2Percentage) / 100;
    const afterDisc2 = afterDisc1 - cartState.discount2;

    // cartState.discount3 = disc3Amount;
    cartState.discount3 = (afterDisc2 * disc3Percentage) / 100;
    const afterDisc3 = afterDisc2 - cartState.discount3;

    // Calculate netto (final amount after all discounts)
    cartState.netto = afterDisc3 - cartState.discount3;

    // Update display
    updateAmountDisplay();
}

function updateAmountDisplay() {
    // Update visible amounts
    $("#hpp-amount").text(`(+) ${formatMoney(cartState.hpp)}`);
    $("#bruto-amount").text(`(+) ${formatMoney(cartState.bruto)}`);
    $("#discount-amount").text(`(-) ${formatMoney(cartState.discount1)}`);
    $("#discount-amount2").text(`(-) ${formatMoney(cartState.discount2)}`);
    $("#discount-amount3").text(`(-) ${formatMoney(cartState.discount3)}`);
    $("#netto-amount").text(formatMoney(cartState.netto));

    // Update hidden inputs
    $("#hpp_amount").val(cartState.hpp);
    $("#bruto_amount_input").val(cartState.bruto);
    $("#discount_amount_input").val(cartState.discount1);
    $("#discount_amount2_input").val(cartState.discount2);
    $("#discount_amount3_input").val(cartState.discount3);
    $("#netto_amount_input").val(cartState.netto);
}


// End : Kalkulasi Total

// start : Fungsi submit

function submitForm() {
    const form = $("#send-online-form");

    // Show loading state
    Swal.fire({
        title: 'Menyimpan...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    // Gather all form data, not just products
    const formData = new FormData(form[0]);

    // Add default empty values for removed fields
    formData.append('idemployee', '');  // Empty employee ID
    formData.append('j_transaksi', '');  // Empty transaction type
    formData.append('jenis_barang', '');  // Empty item type
    formData.append('no_po', '');  // Empty PO number

    // Add products data
    cartState.items.forEach((item, index) => {
        formData.append(`products[${index}][id_product]`, item.id_product);
        formData.append(`products[${index}][barcode]`, item.barcode);
        formData.append(`products[${index}][product_name]`, item.product_name);
        formData.append(`products[${index}][quantity]`, item.quantity);
        formData.append(`products[${index}][qty]`, item.qty);
        formData.append(`products[${index}][qty_pcs]`, item.qty_pcs || 0);
        formData.append(`products[${index}][price_pack]`, item.price_sell);
        formData.append(`products[${index}][price_pcs]`, item.price_pcs);
        formData.append(`products[${index}][hpp_pcs]`, item.hpp_pcs);
        formData.append(`products[${index}][hpp_total]`, item.hpp_total);
        formData.append(`products[${index}][subtotal]`, item.subtotal);
    });

    // Add summary values
    formData.append('hpp_amount', cartState.hpp);
    formData.append('bruto_amount', cartState.bruto);
    formData.append('total_pasang', cartState.totalPasang);
    formData.append('discount_amount', cartState.discount1);
    formData.append('discount_amount2', cartState.discount2);
    formData.append('discount_amount3', cartState.discount3);
    formData.append('netto_amount', cartState.netto);

    // Send the request
    $.ajax({
        url: form.attr('action'),
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        success: function (response) {
            Swal.close();

            if (response.success) {
                // Pop-up dengan pilihan Print atau Tidak
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Disimpan!',
                    html: `
                        <p>${response.message}</p>
                        <p class="mt-3"><strong>No. Faktur: ${response.no_faktur}</strong></p>
                        <p class="text-muted">Apakah Anda ingin mencetak invoice sekarang?</p>
                    `,
                    showDenyButton: true,
                    showCancelButton: false,
                    confirmButtonText: '<i class="bi bi-printer"></i> Ya, Print',
                    denyButtonText: '<i class="bi bi-x-circle"></i> Tidak',
                    confirmButtonColor: '#3085d6',
                    denyButtonColor: '#6c757d',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Jika pilih Print - buka di tab baru dan redirect
                        const printUrl = `/admin/inventory/send-online/${response.send_id}/print`;
                        window.open(printUrl, '_blank');

                        // Tunggu sebentar lalu redirect ke index
                        setTimeout(() => {
                            window.location.href = '/admin/inventory/send-online';
                        }, 500);
                    } else if (result.isDenied) {
                        // Jika pilih Tidak - langsung redirect ke index
                        window.location.href = '/admin/inventory/send-online';
                    }
                });

            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: response.message || 'Terjadi kesalahan saat memproses permintaan.',
                    confirmButtonText: 'OK'
                });
            }
        },
        error: function (xhr, status, error) {
            Swal.close();
            console.error('Error:', xhr.responseText);

            let errorMessage = 'Terjadi kesalahan saat memproses permintaan.';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            }

            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: errorMessage,
                confirmButtonText: 'OK'
            });
        }
    });
}

function clearForm() {
    // Reset cart state
    cartState.items = [];
    cartState.hpp = 0;
    cartState.bruto = 0;
    cartState.discount1 = 0;
    cartState.discount2 = 0;
    cartState.discount3 = 0;
    cartState.netto = 0;

    // Clear the cart table
    $("#cart-body").empty();
    showEmptyCartMessage();

    // Reset form fields
    $('#send-online-form')[0].reset();

    // Clear any validation states
    $('.is-invalid').removeClass('is-invalid');
    $('.is-valid').removeClass('is-valid');
    $('.invalid-feedback').remove();

    // Update displays
    updateCartSummary();

    // Focus on the first input
    $('#product-search').focus();
}
// End : Fungsi submit

// ============ QUEUE PROCESSING SYSTEM ============
async function processQueue() {
    if (isProcessing || scanQueue.length === 0) {
        return;
    }

    isProcessing = true;
    const barcode = scanQueue.shift();
    pendingScans = scanQueue.length;

    // Update UI untuk menunjukkan pending scans
    updatePendingScansIndicator();

    try {
        await searchProductByBarcodeAsync(barcode);
    } catch (error) {
        console.error('Error processing barcode:', error);
    }

    isProcessing = false;

    // Process next item in queue
    if (scanQueue.length > 0) {
        setTimeout(() => processQueue(), 50); // Small delay antar request
    } else {
        updatePendingScansIndicator();
    }
}

// Function untuk update indicator pending scans
function updatePendingScansIndicator() {
    if (pendingScans > 0) {
        if ($('#pending-scans-indicator').length === 0) {
            $('#product-search').after(`
                <div id="pending-scans-indicator" class="alert alert-info mt-2 py-2">
                    <i class="fas fa-spinner fa-spin"></i> 
                    Memproses <span id="pending-count">${pendingScans}</span> scan...
                </div>
            `);
        } else {
            $('#pending-count').text(pendingScans);
        }
    } else {
        $('#pending-scans-indicator').remove();
    }
}

// ============ ASYNC VERSION OF SEARCH PRODUCT ============
function searchProductByBarcodeAsync(barcode) {
    return new Promise((resolve, reject) => {
        const apiUrl = `/api/v1/products/findByBarcode/${barcode}`;

        $.ajax({
            url: apiUrl,
            type: 'GET',
            success: function (response) {
                if (response.success) {
                    addProductToCart(response.product);
                    showCompactNotification(`✓ ${response.product.name}`, 'success');
                    resolve(response.product);
                } else {
                    showCompactNotification(`⚠ ${barcode} tidak ditemukan`, 'warning');
                    reject(response.message || 'Product not found');
                }
            },
            error: function (xhr, status, error) {
                console.error("API Error:", xhr, status, error);
                let errorMessage = 'Error searching for product';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                showCompactNotification(`❌ Error: ${barcode}`, 'error');
                reject(errorMessage);
            }
        });
    });
}

// ============ COMPACT NOTIFICATION SYSTEM ============
let notificationTimeout;
function showCompactNotification(message, type = 'success') {
    const $notification = $('#scan-notification');

    const colors = {
        success: '#50cd89',
        warning: '#ffc107',
        error: '#f1416c',
        info: '#009ef7'
    };

    if ($notification.length === 0) {
        $('body').append(`
            <div id="scan-notification" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 500;
                display: none;
                min-width: 200px;
                text-align: center;
            "></div>
        `);
    }

    clearTimeout(notificationTimeout);

    $('#scan-notification')
        .css('background', colors[type] || colors.success)
        .text(message)
        .fadeIn(200);

    notificationTimeout = setTimeout(() => {
        $('#scan-notification').fadeOut(200);
    }, 1500);
}

// ============ F1 PRODUCT SEARCH MODAL ============

// Initialize F1 Product Search
function initializeF1ProductSearch() {
    // Listen untuk F1 key pada input product-search
    $('#product-search').on('keydown', function (e) {
        // F1 key = keyCode 112
        if (e.key === 'F1' || e.keyCode === 112) {
            e.preventDefault();
            openProductSearchModal();
            return false;
        }
    });
}

// Open Product Search Modal
function openProductSearchModal() {
    // Create modal jika belum ada
    if (!productSearchModal) {
        createProductSearchModal();
    }

    // Show modal
    $('#productSearchModal').modal('show');

    // Focus pada search input
    setTimeout(() => {
        $('#modal-product-search').focus();
    }, 300);

    // Load initial products
    loadProducts('');
}

// Create Product Search Modal HTML
function createProductSearchModal() {
    const modalHTML = `
        <div class="modal fade" id="productSearchModal" tabindex="-1" aria-labelledby="productSearchModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary">
                        <h5 class="modal-title text-white" id="productSearchModalLabel">
                            <i class="bi bi-search"></i> Cari Artikel
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Search Input -->
                        <div class="mb-4">
                            <div class="input-group">
                                <span class="input-group-text bg-light">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" class="form-control form-control-lg" 
                                       id="modal-product-search" 
                                       placeholder="Ketik nama artikel untuk mencari..."
                                       autocomplete="off">
                            </div>
                            <small class="text-muted">
                                <i class="bi bi-info-circle"></i> 
                                Minimal 3 karakter untuk mencari
                            </small>
                        </div>
                        
                        <!-- Loading Indicator -->
                        <div id="modal-loading" class="text-center py-5" style="display: none;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2 text-muted">Mencari artikel...</p>
                        </div>
                        
                        <!-- Products List -->
                        <div id="modal-products-list" class="list-group" style="max-height: 400px; overflow-y: auto;">
                            <!-- Products akan dimuat di sini -->
                        </div>
                        
                        <!-- Empty State -->
                        <div id="modal-empty-state" class="text-center py-5" style="display: none;">
                            <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc;"></i>
                            <p class="text-muted mt-3">Artikel tidak ditemukan</p>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modal to body
    $('body').append(modalHTML);

    // Initialize modal events
    initializeModalEvents();

    productSearchModal = $('#productSearchModal');
}

// Initialize Modal Events
function initializeModalEvents() {
    // Search input with debounce
    $('#modal-product-search').on('input', function () {
        const searchQuery = $(this).val().trim();

        // Clear previous timeout
        if (productSearchTimeout) {
            clearTimeout(productSearchTimeout);
        }

        // Debounce search - 300ms
        productSearchTimeout = setTimeout(() => {
            if (searchQuery.length >= 3 || searchQuery.length === 0) {
                loadProducts(searchQuery);
            }
        }, 300);
    });

    // Handle Enter key pada search
    $('#modal-product-search').on('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            const firstProduct = $('#modal-products-list .product-item:first');
            if (firstProduct.length) {
                firstProduct.click();
            }
        }

        // ESC untuk close modal
        if (e.key === 'Escape' || e.keyCode === 27) {
            $('#productSearchModal').modal('hide');
        }
    });

    // Clear search saat modal ditutup
    $('#productSearchModal').on('hidden.bs.modal', function () {
        $('#modal-product-search').val('');
        $('#modal-products-list').empty();
    });
}

// Load Products from API
async function loadProducts(searchQuery = '') {
    const $loadingIndicator = $('#modal-loading');
    const $productsList = $('#modal-products-list');
    const $emptyState = $('#modal-empty-state');

    // Show loading
    $loadingIndicator.show();
    $productsList.hide();
    $emptyState.hide();

    try {
        const response = await $.ajax({
            url: '/api/v1/products/search-for-packing',
            type: 'GET',
            data: {
                search: searchQuery,
                limit: 15,
                set_sell: 1
            },
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });

        $loadingIndicator.hide();

        if (response.success && response.products.length > 0) {
            renderProducts(response.products);
            $productsList.show();
        } else {
            $emptyState.show();
        }

    } catch (error) {
        console.error('Error loading products:', error);
        $loadingIndicator.hide();
        $emptyState.show();

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Gagal memuat data artikel',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
}

// Render Products List
function renderProducts(products) {
    const $productsList = $('#modal-products-list');
    $productsList.empty();

    products.forEach(product => {
        const stockBadge = getStockBadge(product.stock);
        const priceSell = formatMoney(product.price_sell || 0);

        const productItem = `
            <a href="javascript:void(0);" 
               class="list-group-item list-group-item-action product-item" 
               data-product-id="${product.id}"
               data-barcode="${product.barcode || ''}">
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            <span class="badge bg-secondary me-2">${product.barcode || 'N/A'}</span>
                            ${product.name}
                        </h6>
                        <p class="mb-1 text-muted small">
                            <i class="bi bi-tag"></i> ${product.quantity || 'N/A'} pcs/pack
                            ${product.color ? ` | <i class="bi bi-palette"></i> ${product.color}` : ''}
                            ${product.size ? ` | <i class="bi bi-rulers"></i> ${product.size}` : ''}
                        </p>
                    </div>
                    <div class="text-end ms-3">
                        <div class="fw-bold text-primary">${priceSell}</div>
                        ${stockBadge}
                    </div>
                </div>
            </a>
        `;

        $productsList.append(productItem);
    });

    // Attach click events
    $('.product-item').on('click', function () {
        const barcode = $(this).data('barcode');
        selectProductFromModal(barcode);
    });
}

// Get Stock Badge
function getStockBadge(stock) {
    const stockValue = parseFloat(stock || 0);

    if (stockValue <= 0) {
        return '<span class="badge bg-danger">Habis</span>';
    } else if (stockValue < 100) {
        return '<span class="badge bg-warning text-dark">Stock: ' + stockValue + ' DZ</span>';
    } else {
        return '<span class="badge bg-success">Stock: ' + stockValue + ' DZ</span>';
    }
}

// Select Product from Modal
async function selectProductFromModal(barcode) {
    if (!barcode) {
        Swal.fire({
            icon: 'warning',
            title: 'Perhatian',
            text: 'Artikel tidak memiliki barcode',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        return;
    }

    // Close modal
    $('#productSearchModal').modal('hide');

    // // Check article limit
    // if (!checkArticleLimit()) {
    //     return;
    // }

    // Add to queue untuk processing
    scanQueue.push(barcode);
    processQueue();

    // Show notification
    showCompactNotification(`⏳ Memproses ${barcode}...`, 'info');
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