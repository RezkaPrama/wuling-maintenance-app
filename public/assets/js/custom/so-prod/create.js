// ============ OPTIMIZED ROW HIGHLIGHTING ============
// Tambahkan CSS untuk highlighting di bagian atas script
const highlightStyles = `
<style id="scan-highlight-styles">
    @keyframes scanPulse {
        0% { 
            background-color: #50cd89; 
            transform: scale(1);
        }
        50% { 
            background-color: #47be7d; 
            transform: scale(1.01);
        }
        100% { 
            background-color: #e8fff3; 
            transform: scale(1);
        }
    }
    
    @keyframes scanFadeOut {
        0% { background-color: #e8fff3; }
        100% { background-color: transparent; }
    }
    
    .scan-highlight-new {
        animation: scanPulse 0.6s ease-out;
        background-color: #e8fff3 !important;
        transition: background-color 0.3s ease;
    }
    
    .scan-highlight-update {
        animation: scanPulse 0.6s ease-out;
        background-color: #fff4de !important;
    }
    
    .scan-highlight-fade {
        animation: scanFadeOut 2s ease-out forwards;
    }
    
    /* Optimasi untuk performance */
    .scan-highlight-new *,
    .scan-highlight-update *,
    .scan-highlight-fade * {
        will-change: auto;
    }
</style>
`;

// Purchase Create Script - OPTIMIZED VERSION
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('scan-highlight-styles')) {
        document.head.insertAdjacentHTML('beforeend', highlightStyles);
    }

    if (!document.getElementById('product-modal-styles')) {
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }

    // ✅ TAMBAH: Inject search button styles
    if (!document.getElementById('search-button-styles')) {
        document.head.insertAdjacentHTML('beforeend', searchButtonStyles);
    }

    initializeComponents();
    initializeEventListeners();
    showEmptyCartMessage();
    generateInvoiceNumber();
});

// ============ OPTIMIZED HIGHLIGHT MANAGER ============
const HighlightManager = {
    activeHighlights: new Set(),
    timeouts: new Map(),
    
    highlight(rowId, isNew = true) {
        const row = document.getElementById(rowId);
        if (!row) return;
        
        // Clear existing timeout jika ada
        this.clearTimeout(rowId);
        
        // Remove old classes
        row.classList.remove('scan-highlight-new', 'scan-highlight-update', 'scan-highlight-fade');
        
        // Force reflow untuk restart animation
        void row.offsetWidth;
        
        // Add new class
        const className = isNew ? 'scan-highlight-new' : 'scan-highlight-update';
        row.classList.add(className);
        
        this.activeHighlights.add(rowId);
        
        // Schedule fade out
        const timeoutId = setTimeout(() => {
            this.fadeOut(rowId);
        }, 2500); // Fade setelah 2.5 detik
        
        this.timeouts.set(rowId, timeoutId);
    },
    
    fadeOut(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;
        
        row.classList.remove('scan-highlight-new', 'scan-highlight-update');
        row.classList.add('scan-highlight-fade');
        
        // Remove setelah animasi selesai
        const fadeTimeoutId = setTimeout(() => {
            row.classList.remove('scan-highlight-fade');
            this.activeHighlights.delete(rowId);
            this.timeouts.delete(rowId);
        }, 2000);
        
        this.timeouts.set(rowId + '-fade', fadeTimeoutId);
    },
    
    clearTimeout(rowId) {
        const timeoutId = this.timeouts.get(rowId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeouts.delete(rowId);
        }
        
        const fadeTimeoutId = this.timeouts.get(rowId + '-fade');
        if (fadeTimeoutId) {
            clearTimeout(fadeTimeoutId);
            this.timeouts.delete(rowId + '-fade');
        }
    },
    
    clearAll() {
        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeouts.clear();
        this.activeHighlights.forEach(rowId => {
            const row = document.getElementById(rowId);
            if (row) {
                row.classList.remove('scan-highlight-new', 'scan-highlight-update', 'scan-highlight-fade');
            }
        });
        this.activeHighlights.clear();
    }
};

// Global state for cart
const cartState = {
    transactionType: '',
    itemType: '',
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
    totalPack: 0
};

// Global variable untuk modal state
let productSearchModal = null;
let productSearchTimeout = null;

// ============ QUEUE SYSTEM - SOLUSI SCAN CEPAT ============
let scanQueue = [];
let isProcessing = false;
let pendingScans = 0;

// Function untuk process queue secara berurutan
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
                    <i class="bi bi-hourglass-split"></i> 
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

// Initialize all components
function initializeComponents() {
    initializeSelect2();
    initializeFormValidation();
}

// AJAX request to generate invoice number
function generateInvoiceNumber(jTransaksi, jenisBarang) {
    $.ajax({
        url: generateReceiptNumberUrl,
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        dataType: 'json',
        success: function (response) {
            cartState.invoiceNumber = response.no_penerimaan;
            $('#no_penerimaan').val(response.no_penerimaan);
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
    // Initialize supplier select2
    const customerSelect = $('#id_cust');
    if (customerSelect.length) {
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
                            $('#cust_name').val(response.data.nama);
                            $('#address_name').val(response.data.alamat);
                            $('#kel').val(response.data.kelurahan);
                            $('#kec').val(response.data.kecamatan);
                            $('#kota_kab').val(response.data.idkota);
                            $('#provinsi').val(response.data.provinsi);

                            const currentTransType = $('#j_transaksi').val();
                            if (currentTransType && response.discounts) {
                                const discountValue = response.discounts[currentTransType] || 0;
                                $('#discount_percentage').val(discountValue).trigger('input');
                                $('#discount_percentage_disp').text(discountValue);
                            }
                        }
                    }
                });
            }
        });
    }
}

function initializeFormValidation() {
    $("#so-prod-form").on('submit', validateFormSubmission);

    const form = document.getElementById('so-prod-form');
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
    e.preventDefault();
    let isValid = true;
    let errors = [];

    if (cartState.items.length === 0) {
        errors.push('Artikel belum di Scan! Silakan tambahkan artikel terlebih dahulu.');
        isValid = false;
    }

    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    submitForm();
    return false;
}

// ============ OPTIMIZED INPUT HANDLER ============
function initializeEventListeners() {
    // ============ TAMBAHKAN INI ============
    // Initialize F1 Product Search
    initializeF1ProductSearch();
    // =======================================
    let inputTimeout = null;

    $("#product-search").on('input', function (e) {
        const searchValue = $(this).val().trim();

        if (inputTimeout) {
            clearTimeout(inputTimeout);
        }

        // Barcode scanner biasanya input sangat cepat (< 100ms per karakter)
        inputTimeout = setTimeout(function () {
            if (searchValue.length >= 3) {
                // Add to queue instead of direct search
                scanQueue.push(searchValue);
                $('#product-search').val(''); // Clear input immediately

                // Start processing queue
                processQueue();
            }
        }, 150); // Reduced timeout untuk faster response
    });

    // Handle Enter key
    $("#product-search").on('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();

            const searchValue = $(this).val().trim();

            if (inputTimeout) {
                clearTimeout(inputTimeout);
            }

            if (searchValue.length >= 3) {
                scanQueue.push(searchValue);
                $(this).val('');
                processQueue();
            }

            return false;
        }
    });

    $("#discount_percentage").on('input', updateDiscounts);
    $("#discount_percentage2").on('input', updateDiscounts);
    $("#discount_percentage3").on('input', updateDiscounts);
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

// ============ ASYNC VERSION OF SEARCH ============
function searchProductByBarcodeAsync(barcode) {
    return new Promise((resolve, reject) => {
        const apiUrl = `/api/v1/products/findByBarcode/${barcode}`;

        $.ajax({
            url: apiUrl,
            type: 'GET',
            success: function (response) {
                if (response.success) {
                    addProductToCart(response.product);
                    showCompactNotification(`✓ ${response.product.name || barcode}`);
                    resolve(response.product);
                } else {
                    showCompactNotification(`✗ ${barcode} tidak ditemukan`, 'error');
                    reject('Product not found');
                }
            },
            error: function (xhr, status, error) {
                console.error("API Error:", xhr, status, error);
                let errorMessage = 'Error searching for product';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                showCompactNotification(`✗ ${errorMessage}`, 'error');
                reject(error);
            }
        });
    });
}

// ============ COMPACT NOTIFICATION SYSTEM ============
let notificationTimeout;
function showCompactNotification(message, type = 'success') {
    const $notification = $('#scan-notification');

    if ($notification.length === 0) {
        $('body').append(`
            <div id="scan-notification" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #50cd89;
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

    // Update background color based on type
    const bgColor = type === 'error' ? '#f1416c' : '#50cd89';
    $('#scan-notification').css('background', bgColor);

    clearTimeout(notificationTimeout);

    $('#scan-notification')
        .text(message)
        .fadeIn(200);

    notificationTimeout = setTimeout(() => {
        $('#scan-notification').fadeOut(200);
    }, 1500);
}

function addProductToCart(product) {
    const price = parseFloat(product.cogs?.toString().replace(/[^\d.-]/g, '')) || 0;
    const hpp = parseFloat(product.price?.toString().replace(/[^\d.-]/g, '')) || 0;

    const existingItemIndex = cartState.items.findIndex(item => item.id_product === product.id);

    if (existingItemIndex !== -1) {
        // Update existing item
        const existingItem = cartState.items[existingItemIndex];
        existingItem.qty += 1;
        existingItem.subtotal = existingItem.qty * parseFloat(existingItem.price_pcs);
        existingItem.hpp_total = existingItem.qty * hpp;
        // Update row dengan highlight (bukan item baru)
        // updateCartRowOptimized(existingItem, false);

        updateCartRow(existingItem);
        playSuccessSound();
    } else {
        // Add new item
        const newItem = {
            id_product: product.id,
            barcode: product.barcode,
            product_name: product.name,
            cogs: product.cogs,
            quantity: product.quantity,
            price_pcs: price,
            hpp_pcs: hpp,
            qty: 1,
            subtotal: price,
            hpp_total: hpp
        };

        cartState.items.push(newItem);
        addCartRow(newItem);
        playSuccessSound();
    }

    updateCartSummary();
    // sortCartTable();
}

function addCartRow(item) {
    $("#empty-cart-row").remove();

    const rowId = `cart-item-${item.id_product}`;
    const newRow = `
        <tr id="${rowId}" class="new-item-highlight">
            <td class="align-middle text-center">${item.barcode}</td>
            <td class="align-middle text-center">${item.product_name}</td>
            <td class="align-middle text-center">${item.quantity}</td>
            <td class="align-middle text-end">${formatMoney(item.cogs)}</td>
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text btn btn-sm btn-secondary qty-decrease" data-product-id="${item.id_product}">-</span>
                    <input type="number" class="form-control text-center product-qty" data-product-id="${item.id_product}" 
                    value="${item.qty}" min="1" style="width: 20px; margin: 0 auto;">
                    <span class="input-group-text btn btn-sm btn-secondary qty-increase" data-product-id="${item.id_product}">+</span>
                </div>
                <input type="hidden" name="products[${item.id_product}][id_product]" value="${item.id_product}">
                <input type="hidden" name="products[${item.id_product}][barcode]" value="${item.barcode}">
                <input type="hidden" name="products[${item.id_product}][product_name]" value="${item.product_name}">
                <input type="hidden" name="products[${item.id_product}][qty]" value="${item.qty}">
                <input type="hidden" name="products[${item.id_product}][quantity]" value="${item.quantity}">
                <input type="hidden" name="products[${item.id_product}][price_pack]" value="${item.cogs}">
                <input type="hidden" name="products[${item.id_product}][subtotal]" value="${item.subtotal}">
                <input type="hidden" name="products[${item.id_product}][hpp_pcs]" value="${item.hpp_pcs}">
                <input type="hidden" name="products[${item.id_product}][hpp_total]" value="${item.hpp_total}">
            </td>
            <td class="align-middle text-end subtotal-value">${formatMoney(item.subtotal)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger remove-item" data-product-id="${item.id_product}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;

    $("#cart-body").prepend(newRow);

    setTimeout(() => {
        $(`#cart-item-${item.id_product}`).removeClass('new-item-highlight');
    }, 2000);

    // Highlight dengan HighlightManager (item baru)
    requestAnimationFrame(() => {
        HighlightManager.highlight(rowId, true);
    });

    attachCartEvents(item.id_product);

    // Keep focus on barcode input
    setTimeout(() => {
        $("#product-search").focus();
    }, 50);
}

function updateCartRow(item) {
    const row = $(`#cart-item-${item.id_product}`);

    row.find('.product-qty').val(item.qty);
    row.find('.subtotal-value').text(`${formatMoney(item.subtotal)}`);
    row.find(`input[name="products[${item.id_product}][qty]"]`).val(item.qty);
    row.find(`input[name="products[${item.id_product}][subtotal]"]`).val(item.subtotal);
    row.find(`input[name="products[${item.id_product}][hpp_total]"]`).val(item.hpp_total);

    // TAMBAHKAN: Pindahkan row ke paling atas
    row.detach().prependTo('#cart-body');
    
    row.addClass('updated-item-highlight');

    setTimeout(() => {
        row.removeClass('updated-item-highlight');
    }, 2000);

    setTimeout(() => {
        $("#product-search").focus();
    }, 50);

    // Highlight dengan HighlightManager (update item)
    requestAnimationFrame(() => {
        HighlightManager.highlight(row, false);
    });
}

function playSuccessSound() {
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

function attachCartEvents(productId) {
    $(`.qty-increase[data-product-id="${productId}"]`).on('click', function () {
        increaseItemQuantity(productId);
        return false;
    });

    $(`.qty-decrease[data-product-id="${productId}"]`).on('click', function () {
        decreaseItemQuantity(productId);
        return false;
    });

    $(`.product-qty[data-product-id="${productId}"]`).on('change', function () {
        updateItemQuantity(productId, parseInt($(this).val()) || 1);
    });

    $(`.remove-item[data-product-id="${productId}"]`).on('click', function () {
        removeCartItem(productId);
        return false;
    });
}

function increaseItemQuantity(productId) {
    const itemIndex = cartState.items.findIndex(item => item.id_product === productId);
    if (itemIndex !== -1) {
        const item = cartState.items[itemIndex];
        item.qty += 1;
        item.subtotal = item.qty * item.price_pcs;
        item.hpp_total = item.qty * item.hpp_pcs;
        updateCartRow(item);
        updateCartSummary();
    }
}

function decreaseItemQuantity(productId) {
    const itemIndex = cartState.items.findIndex(item => item.id_product === productId);
    if (itemIndex !== -1) {
        const item = cartState.items[itemIndex];
        if (item.qty > 1) {
            item.qty -= 1;
            item.subtotal = item.qty * item.price_pcs;
            item.hpp_total = item.qty * item.hpp_pcs;
            updateCartRow(item);
            updateCartSummary();
        }
    }
}

function updateItemQuantity(productId, newQty) {
    const qty = Math.max(1, newQty);
    const itemIndex = cartState.items.findIndex(item => item.id_product === productId);

    if (itemIndex !== -1) {
        const item = cartState.items[itemIndex];
        item.qty = qty;
        item.subtotal = item.qty * item.price_pcs;
        item.hpp_total = item.qty * item.hpp_pcs;
        updateCartRow(item);
        updateCartSummary();
    }
}

function removeCartItem(productId) {
    cartState.items = cartState.items.filter(item => item.id_product !== productId);

    $(`#cart-item-${productId}`).fadeOut(300, function () {
        $(this).remove();

        if (cartState.items.length === 0) {
            showEmptyCartMessage();
        }

        updateCartSummary();
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

    $("#total-pack").text(cartState.totalPack);
    $("#total_pack").val(cartState.totalPack);
    $("#total-amount").text(formatMoney(cartState.bruto));

    updateDiscounts();
}

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

function updateDiscounts() {
    const disc1Percentage = parseFloat($("#discount_percentage").val()) || 0;
    const disc2Percentage = parseFloat($("#discount_percentage2").val()) || 0;
    const disc3Percentage = parseFloat($("#discount_percentage3").val()) || 0;

    cartState.discount1 = (cartState.bruto * disc1Percentage) / 100;
    const afterDisc1 = cartState.bruto - cartState.discount1;

    cartState.discount2 = (afterDisc1 * disc2Percentage) / 100;
    const afterDisc2 = afterDisc1 - cartState.discount2;

    cartState.discount3 = (afterDisc2 * disc3Percentage) / 100;
    const afterDisc3 = afterDisc2 - cartState.discount3;

    cartState.netto = afterDisc3;

    updateAmountDisplay();
}

function updateAmountDisplay() {
    $("#hpp-amount").text(`(+) ${formatMoney(cartState.hpp)}`);
    $("#bruto-amount").text(`(+) ${formatMoney(cartState.bruto)}`);
    $("#discount-amount").text(`(-) ${formatMoney(cartState.discount1)}`);
    $("#discount-amount2").text(`(-) ${formatMoney(cartState.discount2)}`);
    $("#discount-amount3").text(`(-) ${formatMoney(cartState.discount3)}`);
    $("#netto-amount").text(formatMoney(cartState.netto));

    $("#hpp_amount").val(cartState.hpp);
    $("#bruto_amount_input").val(cartState.bruto);
    $("#discount_amount_input").val(cartState.discount1);
    $("#discount_amount2_input").val(cartState.discount2);
    $("#discount_amount3_input").val(cartState.discount3);
    $("#netto_amount_input").val(cartState.netto);
}

function submitForm() {
    const form = $("#so-prod-form");

    Swal.fire({
        title: 'Menyimpan...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    const formData = new FormData(form[0]);

    cartState.items.forEach((item, index) => {
        formData.append(`products[${index}][id_product]`, item.id_product);
        formData.append(`products[${index}][barcode]`, item.barcode);
        formData.append(`products[${index}][product_name]`, item.product_name);
        formData.append(`products[${index}][qty]`, item.qty);
        formData.append(`products[${index}][quantity]`, item.quantity);        
        formData.append(`products[${index}][hpp_total]`, item.hpp_total || 0);

        formData.append(`products[${index}][price_pack]`, item.cogs || 0);
        formData.append(`products[${index}][subtotal]`, item.subtotal || 0);
        formData.append(`products[${index}][hpp_pcs]`, item.hpp_pcs || 0);
    });

    formData.append('hpp_amount', cartState.hpp);
    formData.append('bruto_amount', cartState.bruto);
    formData.append('discount_amount', cartState.discount1);
    formData.append('discount_amount2', cartState.discount2);
    formData.append('discount_amount3', cartState.discount3);
    formData.append('netto_amount', cartState.netto);

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
                        <p class="mt-3"><strong>No. Penerimaan: ${response.receiving_id}</strong></p>
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
                        const printUrl = `/admin/so-prod/so-prod/${response.receiving_id}/print`;
                        window.open(printUrl, '_blank');
                        
                        // Tunggu sebentar lalu redirect ke index
                        setTimeout(() => {
                            window.location.href = '/admin/so-prod/so-prod';
                        }, 500);
                    } else if (result.isDenied) {
                        // Jika pilih Tidak - langsung redirect ke index
                        window.location.href = '/admin/so-prod/so-prod';
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

// ============ F1 PRODUCT SEARCH MODAL ============

// Initialize F1 Product Search
function initializeF1ProductSearch() {
    // Listen untuk F1 key pada input product-search
    $('#product-search').on('keydown', function(e) {
        // F1 key = keyCode 112
        if (e.key === 'F1' || e.keyCode === 112) {
            e.preventDefault();
            openProductSearchModal();
            return false;
        }
    });

     // 2. ✅ TAMBAH: Click handler untuk search button (Mobile & Desktop)
    $('#btn-open-search-modal').on('click', function(e) {
        e.preventDefault();
        openProductSearchModal();
    });
    
    // 3. ✅ TAMBAH: Auto-detect device type
    detectDeviceAndShowHint();
}

// ✅ FUNGSI BARU: Detect device type
function detectDeviceAndShowHint() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Pada mobile, sembunyikan F1 hint, tampilkan button hint
        $('#f1-hint').hide();
        $('#mobile-search-btn').show();
    } else {
        // Pada desktop, tampilkan F1 hint, sembunyikan button hint
        $('#f1-hint').show();
        $('#mobile-search-btn').show(); // Tetap tampilkan untuk kemudahan
    }
}

// ============ UPDATE DOMContentLoaded ============
// Tambahkan button styles injection

const searchButtonStyles = `
<style id="search-button-styles">
    /* Mobile Search Button */
    #btn-open-search-modal {
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    #btn-open-search-modal:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    #btn-open-search-modal:active {
        transform: translateY(0);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        #btn-open-search-modal {
            width: 100%;
            margin-top: 10px;
        }
        
        #product-search {
            width: 100% !important;
        }
    }
    
    /* Pulse animation untuk menarik perhatian */
    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.7);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(13, 110, 253, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(13, 110, 253, 0);
        }
    }
    
    .pulse-animation {
        animation: pulse 2s infinite;
    }
</style>
`;

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
    $('#modal-product-search').on('input', function() {
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
    $('#modal-product-search').on('keydown', function(e) {
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
    $('#productSearchModal').on('hidden.bs.modal', function() {
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
            url: '/api/v1/products/search-for-prod',
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
    $('.product-item').on('click', function() {
        const barcode = $(this).data('barcode');
        selectProductFromModal(barcode);
    });
}

// Get Stock Badge
function getStockBadge(stock) {
    const stockValue = parseFloat(stock || 0);
    
    if (stockValue <= 0) {
        return '<span class="badge bg-info">Belum Tersedia</span>';
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
    
    // Check article limit
    // if (!checkArticleLimit()) {
    //     return;
    // }
    
    // Add to queue untuk processing
    scanQueue.push(barcode);
    processQueue();
    
    // Show notification
    showCompactNotification(`⏳ Memproses ${barcode}...`, 'info');
}

function formatMoney(amount) {
    const cleanAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cleanAmount);
}

// ============ CLEANUP ON PAGE UNLOAD ============
window.addEventListener('beforeunload', () => {
    HighlightManager.clearAll();
});