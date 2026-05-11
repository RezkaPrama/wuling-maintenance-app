// ============ OPTIMIZED ROW HIGHLIGHTING ============
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
    
    .scan-highlight-new *,
    .scan-highlight-update *,
    .scan-highlight-fade * {
        will-change: auto;
    }
</style>
`;

// ============ ADD CSS STYLES FOR MODAL ============
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

// Purchase Create Script with Optimized Barcode Scanner
document.addEventListener('DOMContentLoaded', function () {
    // Inject styles
    if (!document.getElementById('product-modal-styles')) {
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }
    if (!document.getElementById('scan-highlight-styles')) {
        document.head.insertAdjacentHTML('beforeend', highlightStyles);
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

        this.clearTimeout(rowId);

        row.classList.remove('scan-highlight-new', 'scan-highlight-update', 'scan-highlight-fade');

        // Force reflow untuk restart animation
        void row.offsetWidth;

        const className = isNew ? 'scan-highlight-new' : 'scan-highlight-update';
        row.classList.add(className);

        this.activeHighlights.add(rowId);

        const timeoutId = setTimeout(() => {
            this.fadeOut(rowId);
        }, 2500);

        this.timeouts.set(rowId, timeoutId);
    },

    fadeOut(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;

        row.classList.remove('scan-highlight-new', 'scan-highlight-update');
        row.classList.add('scan-highlight-fade');

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

// ============ QUEUE SYSTEM untuk Handle Multiple Scans ============
let scanQueue = [];
let isProcessing = false;
let pendingScans = 0;

// Global variable untuk modal state
let productSearchModal = null;
let productSearchTimeout = null;

// ============ CLEANUP ON PAGE UNLOAD ============
window.addEventListener('beforeunload', () => {
    HighlightManager.clearAll();
});

// Initialize all components
function initializeComponents() {
    initializeSelect2();
    initializeFormValidation();
}

// AJAX request to generate invoice number
function generateInvoiceNumber() {
    $.ajax({
        url: generateSendNumberUrl,
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        dataType: 'json',
        success: function (response) {
            cartState.invoiceNumber = response.no_retur;
            $('#no_retur').val(response.no_retur);
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
    const customerSelect = $('#id_cust');
    customerSelect.select2({
        placeholder: 'Pilih Pelanggan',
        allowClear: true
    });

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

    $('#j_transaksi').on('change', function () {
        const selectedCustomerId = $('#id_cust').val();
        const selectedTransType = $(this).val();

        if (selectedCustomerId && selectedTransType) {
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

function initializeFormValidation() {
    $("#send-return-form").on('submit', validateFormSubmission);

    const form = document.getElementById('send-return-form');
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

    if (!$("#j_transaksi").val()) {
        errors.push('Silakan pilih Jenis Transaksi!');
        isValid = false;
    }

    if (!$("#jenis_barang").val()) {
        errors.push('Silakan pilih Jenis Barang!');
        isValid = false;
    }

    if (!$("input[name='tgl_terima']").val()) {
        errors.push('Silakan isi Tanggal Terima!');
        isValid = false;
    }

    if (!$("#idemployee").val()) {
        errors.push('Silakan pilih Nama Sales!');
        isValid = false;
    }

    if (!$("#id_cust").val()) {
        errors.push('Silakan pilih Pelanggan!');
        isValid = false;
    }

    // NOTE: No Faktur tidak wajib diisi (opsional)

    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    submitForm();
    return false;
}

function initializeEventListeners() {
    $("#product-search").off('keypress keyup input keydown');

    // Initialize F1 Product Search
    initializeF1ProductSearch();

    // ============ OPTIMIZED INPUT HANDLER ============
    $("#product-search").on('input', handleOptimizedInput);
    $("#product-search").on('keydown', handleEnterKey);

    $("#discount_percentage").on('input', updateDiscounts);
    $("#discount_percentage2").on('input', updateDiscounts);
    $("#discount_percentage3").on('input', updateDiscounts);
}

// ============ OPTIMIZED INPUT HANDLER ============
function handleOptimizedInput(e) {
    const searchValue = $(this).val().trim();

    if (cartState.barcodeTimer) {
        clearTimeout(cartState.barcodeTimer);
    }

    cartState.barcodeTimer = setTimeout(function () {
        if (searchValue.length >= 3) {
            scanQueue.push(searchValue);
            $('#product-search').val('');
            processQueue();
        }
    }, 150);
}

// Handle Enter key
function handleEnterKey(e) {
    // F1 key untuk membuka modal
    if (e.key === 'F1' || e.keyCode === 112) {
        e.preventDefault();
        openProductSearchModal();
        return false;
    }

    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();

        const searchValue = $(this).val().trim();

        if (cartState.barcodeTimer) {
            clearTimeout(cartState.barcodeTimer);
        }

        if (searchValue.length >= 3) {
            scanQueue.push(searchValue);
            $(this).val('');
            processQueue();
        }

        return false;
    }
}

// ============ QUEUE PROCESSING SYSTEM ============
async function processQueue() {
    if (isProcessing || scanQueue.length === 0) {
        return;
    }

    isProcessing = true;
    const barcode = scanQueue.shift();
    pendingScans = scanQueue.length;

    updatePendingScansIndicator();

    try {
        await searchProductByBarcodeAsync(barcode);
    } catch (error) {
        console.error('Error processing barcode:', error);
    }

    isProcessing = false;

    if (scanQueue.length > 0) {
        setTimeout(() => processQueue(), 50);
    } else {
        updatePendingScansIndicator();
    }
}

function updatePendingScansIndicator() {
    if (pendingScans > 0) {
        if ($('#pending-scans-indicator').length === 0) {
            $('#product-search').after(`
                <div id="pending-scans-indicator" class="alert alert-info mt-2 py-2">
                    <i class="fas fa-spinner fa-spin"></i> 
                    Processing <span id="pending-count">${pendingScans}</span> pending scan(s)...
                </div>
            `);
        } else {
            $('#pending-count').text(pendingScans);
        }
    } else {
        $('#pending-scans-indicator').remove();
    }
}

// ============ ASYNC SEARCH WITH VALIDASI PRICE_SELL ============
function searchProductByBarcodeAsync(barcode) {
    return new Promise(async (resolve, reject) => {
        const apiUrl = `/api/v1/products/findByBarcode/${barcode}`;

        try {
            const productResponse = await $.ajax({
                url: apiUrl,
                type: 'GET'
            });

            if (productResponse.success) {
                const product = productResponse.product;

                // ========== VALIDASI PRICE_SELL ==========
                const priceSell = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;

                if (priceSell <= 0 || product.price_sell === null) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Harga Jual Tidak Valid!',
                        html: `Artikel <b>${product.name}</b> (${barcode})<br>tidak memiliki harga jual yang valid.<br><br>
                               <span class="text-danger">Harga Jual: ${formatMoney(priceSell)}</span><br><br>
                               Silakan hubungi admin untuk mengatur harga jual artikel ini.`,
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#f1416c'
                    });
                    showCompactNotification(`❌ ${barcode} - Harga tidak valid`, 'error');
                    reject('Harga jual tidak valid');
                    return;
                }
                // ========== END VALIDASI ==========

                addProductToCart(product);
                resolve(product);
            } else {
                showCompactNotification(`❌ ${barcode} tidak ditemukan`, 'error');
                reject(productResponse.message || 'Product not found');
            }
        } catch (error) {
            console.error("API Error:", error);
            let errorMessage = 'Error searching for product';
            if (error.responseJSON && error.responseJSON.message) {
                errorMessage = error.responseJSON.message;
            }
            showCompactNotification(`❌ ${errorMessage}`, 'error');
            reject(errorMessage);
        }
    });
}

function addProductToCart(product) {
    const price = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
    const hpp = parseFloat(product.price?.toString().replace(/[^\d.-]/g, '')) || 0;

    const existingItemIndex = cartState.items.findIndex(item => item.id_product === product.id);

    if (existingItemIndex !== -1) {
        const existingItem = cartState.items[existingItemIndex];
        existingItem.qty += 1;
        existingItem.subtotal = existingItem.qty * parseFloat(existingItem.price_pcs);
        existingItem.hpp_total = existingItem.qty * hpp;

        // Update row dengan highlight (bukan item baru)
        updateCartRowOptimized(existingItem, false);

        playSuccessSound();
        showCompactNotification(`+1 ${product.name} (Total: ${existingItem.qty})`);
    } else {
        const newItem = {
            id_product: product.id,
            barcode: product.barcode,
            product_name: product.name,
            price_sell: product.price_sell,
            quantity: product.quantity,
            price_pcs: price,
            hpp_pcs: hpp,
            qty: 1,
            subtotal: price,
            hpp_total: hpp
        };

        cartState.items.push(newItem);

        // Add row dengan highlight (item baru)
        addCartRowOptimized(newItem);

        playSuccessSound();
        showCompactNotification(`✓ ${product.name}`);
    }

    updateCartSummary();
    sortCartTableOptimized();

    setTimeout(() => {
        $("#product-search").focus();
    }, 50);
}

// ============ COMPACT NOTIFICATION SYSTEM ============
let notificationTimeout;
function showCompactNotification(message, type = 'success') {
    const $notification = $('#scan-notification');

    const bgColor = type === 'error' ? '#f1416c' : (type === 'info' ? '#009ef7' : '#50cd89');

    if ($notification.length === 0) {
        $('body').append(`
            <div id="scan-notification" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${bgColor};
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
        .css('background', bgColor)
        .text(message)
        .fadeIn(200);

    notificationTimeout = setTimeout(() => {
        $('#scan-notification').fadeOut(200);
    }, 1500);
}

// ============ PLAY SUCCESS SOUND ============
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

// ============ OPTIMIZED addCartRow ============
function addCartRowOptimized(item) {
    $("#empty-cart-row").remove();

    const rowId = `cart-item-${item.id_product}`;
    const newRow = `
        <tr id="${rowId}">
            <td class="align-middle text-center">${item.barcode}</td>
            <td class="align-middle text-center">${item.product_name}</td>
            <td class="align-middle text-center">${item.quantity}</td>
            <td class="align-middle text-end">${formatMoney(item.price_sell)}</td>
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
                <input type="hidden" name="products[${item.id_product}][quantity]" value="${item.quantity}">
                <input type="hidden" name="products[${item.id_product}][qty]" value="${item.qty}">
                <input type="hidden" name="products[${item.id_product}][price_pack]" value="${item.price_sell}">
                <input type="hidden" name="products[${item.id_product}][subtotal]" value="${item.subtotal}">
                <input type="hidden" name="products[${item.id_product}][hpp_pcs]" value="${item.hpp_pcs}">
                <input type="hidden" name="products[${item.id_product}][hpp_total]" value="${item.hpp_total}">
            </td>
            <td style="display: none;">
                <div class="input-group input-group-sm">
                    <span class="input-group-text btn btn-sm btn-secondary qty-decrease" data-product-id="${item.id_product}">-</span>
                    <input type="number" class="form-control text-center product-qty-pcs" data-product-id="${item.id_product}" 
                    value="${item.qty_pcs}" min="1" style="width: 20px; margin: 0 auto;">
                    <span class="input-group-text btn btn-sm btn-secondary qty-increase" data-product-id="${item.id_product}">+</span>
                </div>
            </td>
            <td class="align-middle text-end subtotal-value">${formatMoney(item.subtotal)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger remove-item" data-product-id="${item.id_product}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;

    $("#cart-body").append(newRow);

    // Highlight dengan HighlightManager (item baru)
    requestAnimationFrame(() => {
        HighlightManager.highlight(rowId, true);
    });

    attachCartEvents(item.id_product);
}

// ============ OPTIMIZED updateCartRow ============
function updateCartRowOptimized(item, isNew = false) {
    const rowId = `cart-item-${item.id_product}`;
    const row = document.getElementById(rowId);

    if (!row) return;

    const updates = [
        { selector: '.product-qty', value: item.qty },
        { selector: '.subtotal-value', value: formatMoney(item.subtotal), isText: true },
        { selector: `input[name="products[${item.id_product}][qty]"]`, value: item.qty },
        { selector: `input[name="products[${item.id_product}][subtotal]"]`, value: item.subtotal },
        { selector: `input[name="products[${item.id_product}][hpp_total]"]`, value: item.hpp_total }
    ];

    updates.forEach(update => {
        const element = row.querySelector(update.selector);
        if (element) {
            if (update.isText) {
                element.textContent = update.value;
            } else {
                element.value = update.value;
            }
        }
    });

    // Highlight dengan HighlightManager (update item)
    requestAnimationFrame(() => {
        HighlightManager.highlight(rowId, false);
    });
}

// Alias untuk backward compatibility
function addCartRow(item) {
    addCartRowOptimized(item);
}

function updateCartRow(item) {
    updateCartRowOptimized(item, false);
}

// Scroll to element helper (tetap dipertahankan)
function scrollToElement(selector) {
    const element = $(selector)[0];
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

// ============ OPTIMIZED removeCartItem ============
function removeCartItem(productId) {
    const rowId = `cart-item-${productId}`;

    // Clear highlight timeout
    HighlightManager.clearTimeout(rowId);

    cartState.items = cartState.items.filter(item => item.id_product !== productId);

    const row = document.getElementById(rowId);
    if (row) {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            row.remove();
            if (cartState.items.length === 0) {
                showEmptyCartMessage();
            }
            updateCartSummary();
            $("#product-search").focus();
        }, 300);
    }
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

// ============ OPTIMIZED sortCartTable ============
function sortCartTableOptimized() {
    const tbody = document.getElementById('cart-body');
    const rows = Array.from(tbody.querySelectorAll('tr:not(#empty-cart-row)'));

    rows.sort((a, b) => {
        const nameA = a.querySelector('td:nth-child(2)')?.textContent.trim().toUpperCase() || '';
        const nameB = b.querySelector('td:nth-child(2)')?.textContent.trim().toUpperCase() || '';
        return nameA.localeCompare(nameB);
    });

    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));
    tbody.appendChild(fragment);
}

function sortCartTable() {
    sortCartTableOptimized();
}

// ============ PERBAIKAN BUG: Kalkulasi Total ============
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

    // BUG FIX: sebelumnya "afterDisc3 - cartState.discount3" (double minus)
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

// ============ SUBMIT FORM ============
function submitForm() {
    const form = $("#send-return-form");

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
        formData.append(`products[${index}][quantity]`, item.quantity);
        formData.append(`products[${index}][qty]`, item.qty);
        formData.append(`products[${index}][price_pack]`, item.price_sell);
        formData.append(`products[${index}][price_pcs]`, item.price_pcs);
        formData.append(`products[${index}][hpp_pcs]`, item.hpp_pcs);
        formData.append(`products[${index}][hpp_total]`, item.hpp_total);
        formData.append(`products[${index}][subtotal]`, item.subtotal);
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
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: response.message,
                    showConfirmButton: true,
                    confirmButtonText: 'OK'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/admin/inventory/send-return';
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
    cartState.items = [];
    cartState.hpp = 0;
    cartState.bruto = 0;
    cartState.discount1 = 0;
    cartState.discount2 = 0;
    cartState.discount3 = 0;
    cartState.netto = 0;

    $("#cart-body").empty();
    showEmptyCartMessage();

    $('#send-return-form')[0].reset();

    $('.is-invalid').removeClass('is-invalid');
    $('.is-valid').removeClass('is-valid');
    $('.invalid-feedback').remove();

    updateCartSummary();

    $('#product-search').focus();
}

// Utility functions
function formatMoney(amount) {
    const cleanAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cleanAmount);
}

// ============ F1 PRODUCT SEARCH MODAL ============

function initializeF1ProductSearch() {
    $('#product-search').on('keydown', function (e) {
        if (e.key === 'F1' || e.keyCode === 112) {
            e.preventDefault();
            openProductSearchModal();
            return false;
        }
    });
}

function openProductSearchModal() {
    if (!productSearchModal) {
        createProductSearchModal();
    }

    $('#productSearchModal').modal('show');

    setTimeout(() => {
        $('#modal-product-search').focus();
    }, 300);

    loadProducts('');
}

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
                                Minimal 3 karakter untuk mencari | Tekan <kbd>F1</kbd> untuk membuka pencarian
                            </small>
                        </div>
                        
                        <div id="modal-loading" class="text-center py-5" style="display: none;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2 text-muted">Mencari artikel...</p>
                        </div>
                        
                        <div id="modal-products-list" class="list-group" style="max-height: 400px; overflow-y: auto;">
                        </div>
                        
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

    $('body').append(modalHTML);
    initializeModalEvents();
    productSearchModal = $('#productSearchModal');
}

function initializeModalEvents() {
    $('#modal-product-search').on('input', function () {
        const searchQuery = $(this).val().trim();

        if (productSearchTimeout) {
            clearTimeout(productSearchTimeout);
        }

        productSearchTimeout = setTimeout(() => {
            if (searchQuery.length >= 3 || searchQuery.length === 0) {
                loadProducts(searchQuery);
            }
        }, 300);
    });

    $('#modal-product-search').on('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            const firstProduct = $('#modal-products-list .product-item:first');
            if (firstProduct.length) {
                firstProduct.click();
            }
        }

        if (e.key === 'Escape' || e.keyCode === 27) {
            $('#productSearchModal').modal('hide');
        }
    });

    $('#productSearchModal').on('hidden.bs.modal', function () {
        $('#modal-product-search').val('');
        $('#modal-products-list').empty();
    });
}

async function loadProducts(searchQuery = '') {
    const $loadingIndicator = $('#modal-loading');
    const $productsList = $('#modal-products-list');
    const $emptyState = $('#modal-empty-state');

    $loadingIndicator.show();
    $productsList.hide();
    $emptyState.hide();

    try {
        const response = await $.ajax({
            url: '/api/v1/products/search-for-send',
            type: 'GET',
            data: {
                search: searchQuery,
                limit: 15,
                set_sell: 1
            },
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        $loadingIndicator.hide();

        if (response.success && response.products && response.products.length > 0) {
            renderProducts(response.products);
            $productsList.show();
        } else {
            $emptyState.show();
        }

    } catch (error) {
        console.error('Error loading products:', error);
        $loadingIndicator.hide();
        $emptyState.show();

        let errorMessage = 'Gagal memuat data artikel';
        if (error.responseJSON) {
            errorMessage = error.responseJSON.message || errorMessage;
        } else if (error.statusText) {
            errorMessage = `Error: ${error.statusText}`;
        }

        Swal.fire({
            icon: 'error',
            title: 'Error',
            html: `<p>${errorMessage}</p><small class="text-muted">Status: ${error.status || 'Unknown'}</small>`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000
        });
    }
}

function renderProducts(products) {
    const $productsList = $('#modal-products-list');
    $productsList.empty();

    products.forEach(product => {
        const stockBadge = getStockBadge(product.stock);
        const priceSell = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
        const priceDisplay = formatMoney(priceSell);

        const isPriceInvalid = priceSell <= 0 || product.price_sell === null;
        const priceClass = isPriceInvalid ? 'text-danger' : 'text-primary';
        const priceBadge = isPriceInvalid ? '<span class="badge bg-danger ms-2">Harga Tidak Valid</span>' : '';
        const itemClass = isPriceInvalid ? 'disabled opacity-50' : '';

        const productItem = `
            <a href="javascript:void(0);" 
               class="list-group-item list-group-item-action product-item ${itemClass}" 
               data-product-id="${product.id}"
               data-barcode="${product.barcode || ''}"
               ${isPriceInvalid ? 'style="cursor: not-allowed;"' : ''}>
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
                        <div class="fw-bold ${priceClass}">${priceDisplay}${priceBadge}</div>
                        ${stockBadge}
                    </div>
                </div>
            </a>
        `;

        $productsList.append(productItem);
    });

    $('.product-item').on('click', function () {
        if ($(this).hasClass('disabled')) {
            Swal.fire({
                icon: 'warning',
                title: 'Harga Tidak Valid',
                text: 'Artikel ini tidak dapat ditambahkan karena harga jual tidak valid',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            return;
        }

        const barcode = $(this).data('barcode');
        selectProductFromModal(barcode);
    });
}

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

    $('#productSearchModal').modal('hide');

    // Validasi price_sell sebelum add ke queue
    try {
        const productResponse = await $.ajax({
            url: `/api/v1/products/findByBarcode/${barcode}`,
            type: 'GET'
        });

        if (productResponse.success) {
            const product = productResponse.product;
            const priceSell = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;

            if (priceSell <= 0 || product.price_sell === null) {
                Swal.fire({
                    icon: 'error',
                    title: 'Harga Jual Tidak Valid!',
                    html: `Artikel <b>${product.name}</b> (${barcode})<br>tidak memiliki harga jual yang valid.<br><br>
                           <span class="text-danger">Harga Jual: ${formatMoney(priceSell)}</span><br><br>
                           Silakan hubungi admin untuk mengatur harga jual artikel ini.`,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f1416c'
                });
                showCompactNotification(`❌ ${barcode} - Harga tidak valid`, 'error');
                return;
            }
        }
    } catch (error) {
        console.error('Error validating product:', error);
        showCompactNotification(`❌ Gagal validasi produk`, 'error');
        return;
    }

    // Add to queue untuk processing
    scanQueue.push(barcode);
    processQueue();

    showCompactNotification(`⏳ Memproses ${barcode}...`, 'info');
}