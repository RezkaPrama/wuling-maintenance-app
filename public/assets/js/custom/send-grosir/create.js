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

// Purchase Create Script - Optimized with Queue System
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('product-modal-styles')) {
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }

    if (!document.getElementById('scan-highlight-styles')) {
        document.head.insertAdjacentHTML('beforeend', highlightStyles);
    }
    initializeComponents();
    initializeEventListeners();
    showEmptyCartMessage();
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
    totalPack: 0
};

// ============ KONSTANTA LIMIT ARTIKEL ============
const MAX_ARTICLES = 23;
const SOURCE_WAREHOUSE_ID = 15;

// ============ Queue System untuk Handle Multiple Scans ============
let scanQueue = [];
let isProcessing = false;
let pendingScans = 0;

// Initialize all components
function initializeComponents() {
    initializeTransactionChangeHandler();
    initializeSelect2();
    initializeFormValidation();
    initializeBulanFakturHandler();
}

function initializeBulanFakturHandler() {
    // Set default bulan ke bulan sekarang
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    $('#bulan_faktur').val(currentMonth).trigger('change');

    // Trigger saat bulan faktur berubah
    $('#bulan_faktur').on('change', function () {
        const jTransaksi = $('#j_transaksi').val();
        const jenisBarang = $('#jenis_barang option:selected').data('nama');
        const bulanFaktur = $('#bulan_faktur').val();

        // Re-generate faktur number jika semua data sudah terisi
        if (jTransaksi && jenisBarang && bulanFaktur) {
            generateInvoiceNumber(jTransaksi, jenisBarang, bulanFaktur);
        }
    });
}

// Handle changes in transaction type and item type
function initializeTransactionChangeHandler() {
    $('#j_transaksi, #jenis_barang').change(function () {
        const jTransaksi = $('#j_transaksi').val();
        const jenisBarang = $('#jenis_barang option:selected').data('nama');
        const bulanFaktur = $('#bulan_faktur').val();

        if (jTransaksi && jenisBarang && bulanFaktur) {
            cartState.transactionType = jTransaksi;
            cartState.itemType = jenisBarang;
            generateInvoiceNumber(jTransaksi, jenisBarang, bulanFaktur);
        }
    });
}

// AJAX request to generate invoice number
function generateInvoiceNumber(jTransaksi, jenisBarang, bulanFaktur = null) {
    // Gunakan bulan dari parameter atau dari input
    if (!bulanFaktur) {
        bulanFaktur = $('#bulan_faktur').val();
    }

    $.ajax({
        url: generateSendNumberUrl,
        type: 'POST',
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
        data: {
            jenis_trans: jTransaksi,
            jenis_barang: jenisBarang,
            bulan_faktur: bulanFaktur
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
    const customerSelect = $('#id_cust');
    customerSelect.select2({ placeholder: 'Pilih Pelanggan', allowClear: true });

    customerSelect.on('change', function () {
        const selectedCustomerId = $(this).val();
        if (selectedCustomerId) {
            $.ajax({
                url: getCustomer,
                type: 'POST',
                headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
                data: { idcust: selectedCustomerId },
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

    $('#j_transaksi').on('change', function () {
        const selectedCustomerId = $('#id_cust').val();
        const selectedTransType = $(this).val();
        if (selectedCustomerId && selectedTransType) {
            $.ajax({
                url: getCustomer,
                type: 'POST',
                headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
                data: { idcust: selectedCustomerId },
                dataType: 'json',
                success: function (response) {
                    if (response.success && response.discounts) {
                        const discountValue = response.discounts[selectedTransType] || 0;
                        $('#discount_percentage').val(discountValue).trigger('input');
                    }
                }
            });
        }
    });
}

function initializeFormValidation() {
    $("#send-form").on('submit', validateFormSubmission);
    const form = document.getElementById('send-form');
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

    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    submitForm();
    return false;
}

function initializeEventListeners() {
    // ============ OPTIMIZED INPUT HANDLER dengan Queue System ============
    let inputTimeout = null;

    // ============ TAMBAHKAN INI ============
    // Initialize F1 Product Search
    initializeF1ProductSearch();
    // =======================================

    $("#product-search").on('input', function (e) {
        const searchValue = $(this).val().trim();

        if (inputTimeout) {
            clearTimeout(inputTimeout);
        }

        // Barcode scanner sangat cepat (< 100ms per karakter)
        inputTimeout = setTimeout(function () {
            if (searchValue.length >= 3) {
                scanQueue.push(searchValue);
                $('#product-search').val('');
                processQueue();
            }
        }, 150);
    });

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

// ============ VALIDASI LIMIT ARTIKEL ============
function checkArticleLimit() {
    const uniqueArticles = cartState.items.length;

    if (uniqueArticles >= MAX_ARTICLES) {
        Swal.fire({
            icon: 'warning',
            title: 'Batas Maksimal Artikel!',
            html: `Anda telah mencapai batas maksimal <b>${MAX_ARTICLES} artikel</b>.<br>Tidak dapat menambah artikel baru.`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#f1416c'
        });
        return false;
    }

    return true;
}

// ============ PENGECEKAN STOCK WAREHOUSE ============
function checkProductStock(productId, barcode) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/v1/stock/check/${SOURCE_WAREHOUSE_ID}/${productId}`,
            type: 'GET',
            headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
            success: function (response) {
                if (response.success) {
                    const stock = response.stock;
                    const totalStock = (stock.saldo_akhir_dz * 24) + stock.saldo_akhir_psg;

                    if (totalStock <= 0) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Stock Kosong!',
                            html: `Artikel <b>${barcode}</b> tidak memiliki stock di gudang.<br><br>
                                   <span class="text-danger">Stock: ${stock.saldo_akhir_dz} DZ ${stock.saldo_akhir_psg} PSG</span>`,
                            confirmButtonText: 'OK',
                            confirmButtonColor: '#f1416c'
                        });
                        reject('Stock tidak tersedia');
                    } else {
                        resolve({
                            available: true,
                            stock: stock
                        });
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Stock Tidak Ditemukan!',
                        text: `Artikel ${barcode} tidak ditemukan di gudang`,
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#f1416c'
                    });
                    reject('Stock tidak ditemukan');
                }
            },
            error: function (xhr, status, error) {
                console.error("Stock Check Error:", xhr, status, error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Cek Stock',
                    text: 'Terjadi kesalahan saat mengecek stock artikel',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f1416c'
                });
                reject(error);
            }
        });
    });
}

// ============ Queue Processing System ============
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

function searchProductByBarcodeAsync(barcode) {
    return new Promise(async (resolve, reject) => {
        const apiUrl = `/api/v1/products/findByBarcode/${barcode}`;

        try {
            const existingItem = cartState.items.find(item => item.barcode === barcode);

            if (!existingItem && !checkArticleLimit()) {
                reject('Batas maksimal artikel tercapai');
                return;
            }

            const productResponse = await $.ajax({
                url: apiUrl,
                type: 'GET'
            });

            if (productResponse.success) {
                const product = productResponse.product;

                // ========== TAMBAHKAN VALIDASI PRICE_SELL DI SINI ==========
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

                try {
                    const stockCheck = await checkProductStock(product.id, barcode);

                    if (stockCheck.available) {
                        addProductToCart(product, stockCheck.stock);
                        resolve(product);
                    }
                } catch (stockError) {
                    reject(stockError);
                }
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

// ============ COMPACT NOTIFICATION SYSTEM ============
let notificationTimeout;
function showCompactNotification(message, type = 'success') {
    const $notification = $('#scan-notification');
    const bgColor = type === 'success' ? '#50cd89' : '#f1416c';

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
    }, 1000);
}

function addProductToCart(product, stockInfo = null) {
    const priceOriginal = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
    const hpp = parseFloat(product.price?.toString().replace(/[^\d.-]/g, '')) || 0;

    // ✅ VALIDASI HARGA ASLI
    if (priceOriginal <= 0 || product.price_sell === null) {
        Swal.fire({
            icon: 'error',
            title: 'Harga Jual Tidak Valid!',
            html: `Artikel <b>${product.name}</b> (${product.barcode})<br>tidak memiliki harga jual yang valid.<br><br>
                   <span class="text-danger">Harga Jual: ${formatMoney(priceOriginal)}</span><br><br>
                   Silakan hubungi admin untuk mengatur harga jual artikel ini.`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#f1416c'
        });
        showCompactNotification(`❌ ${product.barcode} - Harga tidak valid`, 'error');
        return;
    }

    // ✅ MODAL INPUT HARGA GROSIR
    Swal.fire({
        title: 'Input Harga Grosir',
        html: `
            <div class="text-start">
                <div class="mb-3">
                    <strong>Produk:</strong> ${product.name}<br>
                    <strong>Barcode:</strong> ${product.barcode}
                </div>
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    Harga Normal: <strong>${formatMoney(priceOriginal)}</strong>
                </div>
                <div class="form-group">
                    <label for="manual-price" class="form-label fw-bold">Harga Grosir Manual <span class="text-danger">*</span></label>
                    <input type="number" id="manual-price" class="form-control form-control-lg" 
                           value="${priceOriginal}" min="0" step="1000" 
                           placeholder="Masukkan harga grosir">
                    <small class="text-muted">
                        <i class="bi bi-shield-check"></i> Harga ini hanya berlaku untuk transaksi ini
                    </small>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-check-circle"></i> Tambahkan',
        cancelButtonText: '<i class="bi bi-x-circle"></i> Batal',
        confirmButtonColor: '#50cd89',
        cancelButtonColor: '#f1416c',
        focusConfirm: false,
        didOpen: () => {
            document.getElementById('manual-price').focus();
            document.getElementById('manual-price').select();
        },
        preConfirm: () => {
            const manualPrice = parseFloat(document.getElementById('manual-price').value) || 0;
            
            if (manualPrice <= 0) {
                Swal.showValidationMessage('Harga harus lebih dari 0');
                return false;
            }
            
            if (manualPrice > priceOriginal * 2) {
                Swal.showValidationMessage('Harga terlalu tinggi! Maksimal 2x harga normal');
                return false;
            }
            
            return manualPrice;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const manualPrice = result.value;
            
            const existingItemIndex = cartState.items.findIndex(item => item.id_product === product.id);

            if (existingItemIndex !== -1) {
                const existingItem = cartState.items[existingItemIndex];
                existingItem.qty += 1;
                existingItem.subtotal = existingItem.qty * manualPrice;
                existingItem.hpp_total = existingItem.qty * hpp;
                
                updateCartRowOptimized(existingItem, false);
                playSuccessSound();
                showCompactNotification(`+1 ${product.name} @ ${formatMoney(manualPrice)}`);
            } else {
                const newItem = {
                    id_product: product.id,
                    barcode: product.barcode,
                    product_name: product.name,
                    price_sell: priceOriginal, // ✅ Harga asli (untuk tampilan)
                    price_pack_manual: manualPrice, // ✅ Harga manual untuk dikirim ke backend
                    quantity: product.quantity,
                    price_pcs: manualPrice, // Gunakan harga manual untuk kalkulasi
                    hpp_pcs: hpp,
                    qty: 1,
                    subtotal: manualPrice,
                    hpp_total: hpp
                };

                cartState.items.push(newItem);
                addCartRowOptimized(newItem);
                playSuccessSound();
                
                let stockText = '';
                if (stockInfo) {
                    stockText = ` (Stock: ${stockInfo.saldo_akhir_dz} DZ ${stockInfo.saldo_akhir_psg} PSG)`;
                }
                
                const discount = ((priceOriginal - manualPrice) / priceOriginal * 100).toFixed(1);
                showCompactNotification(`✓ ${product.name}${stockText} @ ${formatMoney(manualPrice)} (Diskon ${discount}%)`);
            }

            updateCartSummary();
            sortCartTableOptimized();
            $('#product-search').focus();
        } else {
            $('#product-search').focus();
        }
    });
}

// ============ OPTIMIZED addCartRow ============
function addCartRowOptimized(item) {
    $("#empty-cart-row").remove();

    const rowId = `cart-item-${item.id_product}`;
    
    // ✅ HITUNG DISKON
    const originalPrice = item.price_sell || 0;
    const manualPrice = item.price_pack_manual || 0;
    const discountPercent = originalPrice > 0 ? ((originalPrice - manualPrice) / originalPrice * 100).toFixed(1) : 0;
    
    const newRow = `
        <tr id="${rowId}">
            <td class="align-middle text-center">${item.barcode}</td>
            <td class="align-middle text-center">${item.product_name}</td>
            <td class="align-middle text-center">${item.quantity}</td>
            <td class="align-middle text-end">
                <div>
                    <small class="text-muted"><s>${formatMoney(originalPrice)}</s></small><br>
                    <strong class="text-primary">${formatMoney(manualPrice)}</strong>
                    ${discountPercent > 0 ? `<span class="badge badge-success ms-2">-${discountPercent}%</span>` : ''}
                </div>
            </td>
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
                <input type="hidden" name="products[${item.id_product}][price_pack_manual]" value="${manualPrice}">
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

    $("#cart-body").append(newRow);
    
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

    // Batch DOM updates
    const updates = [
        { selector: '.product-qty', value: item.qty },
        { selector: '.subtotal-value', value: formatMoney(item.subtotal), isText: true },
        { selector: `input[name="products[${item.id_product}][qty]"]`, value: item.qty },
        { selector: `input[name="products[${item.id_product}][subtotal]"]`, value: item.subtotal },
        { selector: `input[name="products[${item.id_product}][hpp_total]"]`, value: item.hpp_total }
    ];

    // Use DocumentFragment untuk batch updates
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

function updateArticleCounter() {
    const articleCount = cartState.items.length;
    $('#article-count').text(articleCount);

    // Show/hide warning
    if (articleCount >= MAX_ARTICLES) {
        $('#article-limit-warning').fadeIn();
        $('#article-count').removeClass('badge-light-primary badge-light-warning').addClass('badge-light-danger');
    } else if (articleCount >= MAX_ARTICLES - 3) {
        $('#article-limit-warning').fadeOut();
        $('#article-count').removeClass('badge-light-primary badge-light-danger').addClass('badge-light-warning');
    } else {
        $('#article-limit-warning').fadeOut();
        $('#article-count').removeClass('badge-light-warning badge-light-danger').addClass('badge-light-primary');
    }
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

function addCartRow(item) {
    $("#empty-cart-row").remove();

    const newRow = `
        <tr id="cart-item-${item.id_product}" class="new-item-highlight">
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
                <input type="hidden" name="products[${item.id_product}][qty]" value="${item.qty}">
                <input type="hidden" name="products[${item.id_product}][quantity]" value="${item.quantity}">
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

    setTimeout(() => {
        $(`#cart-item-${item.id_product}`).removeClass('new-item-highlight');
    }, 2000);

    attachCartEvents(item.id_product);
}

function updateCartRow(item) {
    updateCartRowOptimized(item, false);
}

// ============ OPTIMIZED sortCartTable ============
function sortCartTableOptimized() {
    const tbody = document.getElementById('cart-body');
    const rows = Array.from(tbody.querySelectorAll('tr:not(#empty-cart-row)'));

    // Sort menggunakan native sort
    rows.sort((a, b) => {
        const nameA = a.querySelector('td:nth-child(2)')?.textContent.trim().toUpperCase() || '';
        const nameB = b.querySelector('td:nth-child(2)')?.textContent.trim().toUpperCase() || '';
        return nameA.localeCompare(nameB);
    });

    // Use DocumentFragment untuk batch insert
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));
    tbody.appendChild(fragment);
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

// ============ CLEANUP ON PAGE UNLOAD ============
window.addEventListener('beforeunload', () => {
    HighlightManager.clearAll();
});

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
    cartState.hpp = cartState.items.reduce((sum, item) => sum + (parseFloat(item.hpp_total) || 0), 0);
    cartState.bruto = cartState.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
    cartState.totalPack = cartState.items.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);

    $("#total-pack").text(cartState.totalPack);
    $("#total_pack").val(cartState.totalPack);
    $("#total-amount").text(formatMoney(cartState.bruto));

    // Tambahkan ini
    updateArticleCounter();

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
    const form = $("#send-form");
    Swal.fire({
        title: 'Menyimpan...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => { Swal.showLoading(); }
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
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
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
                        const printUrl = `/admin/inventory/send-manual/print/${response.send_id}`;
                        window.open(printUrl, '_blank');

                        // Tunggu sebentar lalu redirect ke index
                        setTimeout(() => {
                            window.location.href = '/admin/inventory/send-grosir';
                        }, 500);
                    } else if (result.isDenied) {
                        // Jika pilih Tidak - langsung redirect ke index
                        window.location.href = '/admin/inventory/send-grosir';
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

// Global variable untuk modal state
let productSearchModal = null;
let productSearchTimeout = null;

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

// Load Products from API dengan Better Error Handling
async function loadProducts(searchQuery = '') {
    const $loadingIndicator = $('#modal-loading');
    const $productsList = $('#modal-products-list');
    const $emptyState = $('#modal-empty-state');

    // Show loading
    $loadingIndicator.show();
    $productsList.hide();
    $emptyState.hide();

    try {
        console.log('Loading products with query:', searchQuery);

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
            timeout: 10000 // 10 second timeout
        });

        console.log('API Response:', response);

        $loadingIndicator.hide();

        if (response.success && response.products && response.products.length > 0) {
            renderProducts(response.products);
            $productsList.show();
        } else {
            console.log('No products found');
            $emptyState.show();
        }

    } catch (error) {
        console.error('Error loading products:', error);
        $loadingIndicator.hide();
        $emptyState.show();

        let errorMessage = 'Gagal memuat data artikel';

        // Parse error message
        if (error.responseJSON) {
            errorMessage = error.responseJSON.message || errorMessage;
            console.error('Server Error:', error.responseJSON);
        } else if (error.statusText) {
            errorMessage = `Error: ${error.statusText}`;
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Show error notification
        Swal.fire({
            icon: 'error',
            title: 'Error',
            html: `<p>${errorMessage}</p>
                   <small class="text-muted">Status: ${error.status || 'Unknown'}</small>`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000
        });

        // Show error in console for debugging
        console.error('Full error details:', {
            status: error.status,
            statusText: error.statusText,
            responseText: error.responseText,
            responseJSON: error.responseJSON
        });
    }
}

// Render Products List
function renderProducts(products) {
    const $productsList = $('#modal-products-list');
    $productsList.empty();

    products.forEach(product => {
        const stockBadge = getStockBadge(product.stock);
        const priceSell = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
        const priceDisplay = formatMoney(priceSell);

        // ========== TAMBAHKAN PENGECEKAN HARGA ==========
        const isPriceInvalid = priceSell <= 0 || product.price_sell === null;
        const priceClass = isPriceInvalid ? 'text-danger' : 'text-primary';
        const priceBadge = isPriceInvalid ? '<span class="badge bg-danger ms-2">Harga Tidak Valid</span>' : '';
        const itemClass = isPriceInvalid ? 'disabled opacity-50' : '';
        // ========== END PENGECEKAN ==========

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

    // Attach click events
    $('.product-item').on('click', function () {
        // ========== CEGAH KLIK JIKA HARGA INVALID ==========
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
        // ========== END CEGAH KLIK ==========

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

    // Check article limit
    if (!checkArticleLimit()) {
        return;
    }

    // ========== TAMBAHKAN VALIDASI PRICE_SELL DI SINI ==========
    // Fetch product detail terlebih dahulu untuk validasi
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
    // ========== END VALIDASI ==========

    // Add to queue untuk processing
    scanQueue.push(barcode);
    processQueue();

    // Show notification
    showCompactNotification(`⏳ Memproses ${barcode}...`, 'info');
}