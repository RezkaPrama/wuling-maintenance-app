// ============ PART 1: INJECT CSS STYLES (Tambahkan di BAGIAN ATAS) ============

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
    
    /* Legacy class untuk backward compatibility */
    .new-item-highlight {
        background-color: #e8fff3;
        transition: background-color 2s ease;
    }
    
    .updated-item-highlight {
        background-color: #fff4de;
        transition: background-color 2s ease;
    }
</style>
`;

// Purchase Create Script
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('scan-highlight-styles')) {
        document.head.insertAdjacentHTML('beforeend', highlightStyles);
    }

    if (!document.getElementById('product-modal-styles')) {
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }

    initializeComponents();
    initializeEventListeners();
    loadExistingShippingData();
    showEmptyCartMessage();
});

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
    totalPack: 0,
    hppAmount: 0,
};

// HighlightManager untuk manage row highlighting
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
        row.classList.remove('new-item-highlight', 'updated-item-highlight'); // Remove legacy classes
        
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
                row.classList.remove('new-item-highlight', 'updated-item-highlight');
            }
        });
        this.activeHighlights.clear();
    }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    HighlightManager.clearAll();
});

// ============ TAMBAHKAN DI BAGIAN ATAS SETELAH cartState ============

// Global variable untuk modal state (F1 Search)
let productSearchModal = null;
let productSearchTimeout = null;

// Initialize all components
function initializeComponents() {
    initializeTransactionChangeHandler();
    initializeSelect2();
    initializeFormValidation();
    initializeBulanFakturHandler();
}

function initializeBulanFakturHandler() {
    // Trigger saat bulan faktur berubah
    $('#bulan_faktur').on('change', function() {
        const jTransaksi = $('#j_transaksi').val();
        const jenisBarang = $('#jenis_barang option:selected').data('nama');
        const bulanFaktur = $('#bulan_faktur').val();
        
        // Re-generate faktur number jika semua data sudah terisi
        if (jTransaksi && jenisBarang && bulanFaktur) {
            generateInvoiceNumber(jTransaksi, jenisBarang, bulanFaktur);
        }
    });
}

function loadExistingShippingData() {
    const pathSegments = window.location.pathname.split('/');
    const shippingId = pathSegments[pathSegments.length - 2];
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    $.ajax({
        url: `/api/v1/send-manual/${shippingId}/details`,
        type: 'GET',
        headers: {
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
        },
        success: function (response) {
            if (response.success) {
                const shipping = response.send;
                const details = response.send_details;

                // ✅ TAMBAHKAN: Temporary unbind change events
                $('#j_transaksi').off('change');
                $('#jenis_barang').off('change');

                // Set form fields
                $('#id_cust').val(shipping.id_cust).trigger('change');
                $('#j_transaksi').val(shipping.j_transaksi).trigger('change');
                $('#jenis_barang').val(shipping.id_jenis_barang).trigger('change');
                $('#no_faktur').val(shipping.no_faktur);
                $('#tgl_faktur').val(shipping.tgl_faktur);
                $('#idemployee').val(shipping.idemployee).trigger('change');
                $('#no_po').val(shipping.no_po);
                $('#note').val(shipping.note);

                // Set discount percentages
                $('#discount_percentage').val(shipping.discount_percentage || 0);
                $('#discount_percentage2').val(shipping.discount_percentage_2 || 0);
                $('#discount_percentage3').val(shipping.discount_percentage_3 || 0);

                // ✅ TAMBAHKAN: Re-bind change events setelah set value
                initializeTransactionChangeHandler();
                
                // Set state values
                cartState.bruto = parseFloat(shipping.bruto_amount) || 0;
                cartState.discount1 = parseFloat(shipping.discount_amount) || 0;
                cartState.discount2 = parseFloat(shipping.discount_amount2) || 0;
                cartState.discount3 = parseFloat(shipping.discount_amount3) || 0;
                cartState.netto = parseFloat(shipping.netto_amount) || 0;

                const originalHppAmount = parseFloat(shipping.hpp_amount) || 0;
                cartState.hppAmount = originalHppAmount;
                cartState.hpp = originalHppAmount;

                cartState.items = [];
                $("#cart-body").empty();

                // Load items into cart
                if (details && details.length > 0) {
                    cartState.items = details.map(detail => ({
                        id_product: detail.id_product,
                        barcode: detail.barcode || '',
                        product_name: detail.product_name,
                        price_sell: parseFloat(detail.price_pack || 0),
                        price_pcs: parseFloat(detail.price_pack || 0),
                        quantity: parseInt(detail.quantity || 1),
                        qty: parseInt(detail.quantity_pack || 1),
                        subtotal: parseFloat(detail.sub_total || 0),
                        hpp_pcs: parseFloat(detail.hpp || 0),
                        hpp_total: parseFloat(detail.hpp || 0) * parseInt(detail.quantity_pack || 1)
                    }));

                    // ✅ Load tanpa highlighting untuk data existing
                    cartState.items.forEach(item => {
                        addCartRowWithoutHighlight(item);
                    });
                } else {
                    showEmptyCartMessage();
                }

                updateCartSummaryWithoutHPP();
            } else {
                showErrorToast('Data pengiriman tidak ditemukan!');
            }
        },
        error: function (xhr, status, error) {
            console.error('Error loading shipping data:', error);
            showErrorToast('Gagal memuat data pengiriman: ' + error);
        }
    });
}

// ============ PART 9: HELPER FUNCTION untuk Load Existing Data ============

function addCartRowWithoutHighlight(item) {
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
    
    // NO highlighting untuk existing data
    attachCartEvents(item.id_product);
}

function showErrorToast(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
}

function updateCartSummaryWithoutHPP() {
    // Calculate Bruto (total before discounts)
    cartState.bruto = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
    }, 0);

    // Calculate total pack
    cartState.totalPack = cartState.items.reduce((sum, item) => {
        return sum + (parseInt(item.qty) || 0);
    }, 0);

    // Update total pack display
    $("#total-pack").text(cartState.totalPack);
    $("#total_pack").val(cartState.totalPack);
    $("#total-amount").text(formatMoney(cartState.bruto));

    // Update discount calculations
    updateDiscounts();
}

function updateCartSummary() {
    // Calculate HPP total (cost of goods sold)
    cartState.hpp = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.hpp_total) || 0);
    }, 0);

    // Update hppAmount to match the calculated hpp
    cartState.hppAmount = cartState.hpp;

    // Calculate Bruto (total before discounts)
    cartState.bruto = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
    }, 0);

    // Calculate total pack
    cartState.totalPack = cartState.items.reduce((sum, item) => {
        return sum + (parseInt(item.qty) || 0);
    }, 0);

    // Update total pack display
    $("#total-pack").text(cartState.totalPack);
    $("#total_pack").val(cartState.totalPack);
    $("#total-amount").text(formatMoney(cartState.bruto));

    // Update discount calculations
    updateDiscounts();
}

function initializeTransactionChangeHandler() {
    $('#j_transaksi, #jenis_barang').change(function () {
        const jTransaksi = $('#j_transaksi').val();
        const jenisBarang = $('#jenis_barang option:selected').data('nama');
        const bulanFaktur = $('#bulan_faktur').val(); // ✅ TAMBAHKAN INI

        if (jTransaksi && jenisBarang && bulanFaktur) { // ✅ TAMBAHKAN bulanFaktur
            cartState.transactionType = jTransaksi;
            cartState.itemType = jenisBarang;
            generateInvoiceNumber(jTransaksi, jenisBarang, bulanFaktur); // ✅ PASS bulanFaktur
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
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        data: {
            jenis_trans: jTransaksi,
            jenis_barang: jenisBarang,
            bulan_faktur: bulanFaktur // ✅ TAMBAHKAN INI
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
    $("#send-form").on('submit', validateFormSubmission);

    const form = document.getElementById('send-form');

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

    // Validasi warehouse
    if (!$("#j_transaksi").val()) {
        errors.push('Silakan pilih Jenis Transaksi!');
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

function initializeEventListeners() {

    // ============ F1 PRODUCT SEARCH ============
    initializeF1ProductSearch();

    $("#product-search").on('keypress', handleBarcodeInput);

    $("#product-search").on('keyup', handleBarcodeScanner);

    $("#discount_percentage").on('input', updateDiscounts);
    $("#discount_percentage2").on('input', updateDiscounts);
    $("#discount_percentage3").on('input', updateDiscounts);
}

// ============ F1 PRODUCT SEARCH MODAL FUNCTIONS ============

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
            timeout: 10000
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
        
        if (error.responseJSON) {
            errorMessage = error.responseJSON.message || errorMessage;
            console.error('Server Error:', error.responseJSON);
        } else if (error.statusText) {
            errorMessage = `Error: ${error.statusText}`;
        }
        
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
    }
}

// Render Products List
// Render Products List
function renderProducts(products) {
    const $productsList = $('#modal-products-list');
    $productsList.empty();
    
    if (!products || products.length === 0) {
        $('#modal-empty-state').show();
        return;
    }
    
    products.forEach(product => {
        const productId = product.id || 0;
        const barcode = product.barcode || '';
        const name = product.name || 'Unknown Product';
        const quantity = product.quantity || 24;
        const priceSell = product.price_sell || 0;
        const stockDz = product.stock_dz || 0;
        const stockPsg = product.stock_psg || 0;
        const color = product.color || '';
        const size = product.size || '';
        
        const stockBadge = getStockBadgeWithPsg(stockDz, stockPsg);
        
        // ========== TAMBAHKAN PENGECEKAN HARGA ==========
        const priceSellValue = parseFloat(priceSell?.toString().replace(/[^\d.-]/g, '')) || 0;
        const isPriceInvalid = priceSellValue <= 0 || priceSell === null;
        const priceClass = isPriceInvalid ? 'text-danger' : 'text-primary';
        const priceBadge = isPriceInvalid ? '<span class="badge bg-danger ms-2"><i class="bi bi-exclamation-triangle"></i> Harga Invalid</span>' : '';
        const itemClass = isPriceInvalid ? 'disabled opacity-50' : '';
        const formattedPrice = formatMoney(priceSellValue);
        // ========== END PENGECEKAN ==========
        
        const productItem = `
            <a href="javascript:void(0);" 
               class="list-group-item list-group-item-action product-item ${itemClass}" 
               data-product-id="${productId}"
               data-barcode="${barcode}"
               ${isPriceInvalid ? 'style="cursor: not-allowed;"' : ''}>
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            <span class="badge bg-secondary me-2">${barcode || 'N/A'}</span>
                            ${name}
                        </h6>
                        <p class="mb-1 text-muted small">
                            <i class="bi bi-tag"></i> ${quantity} pcs/pack
                            ${color ? ` | <i class="bi bi-palette"></i> ${color}` : ''}
                            ${size ? ` | <i class="bi bi-rulers"></i> ${size}` : ''}
                        </p>
                    </div>
                    <div class="text-end ms-3">
                        <div class="fw-bold ${priceClass} mb-1">${formattedPrice}${priceBadge}</div>
                        ${stockBadge}
                    </div>
                </div>
            </a>
        `;
        
        $productsList.append(productItem);
    });
    
    // Attach click events
    $('.product-item').on('click', function() {
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
        if (barcode) {
            selectProductFromModal(barcode);
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Artikel tidak memiliki barcode',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    });
}

// Get Stock Badge dengan DZ & PSG
function getStockBadgeWithPsg(stockDz, stockPsg) {
    const dz = parseFloat(stockDz || 0);
    const psg = parseFloat(stockPsg || 0);
    
    // Total stock dalam pasang
    const totalPsg = (dz * 24) + psg;
    
    if (totalPsg <= 0) {
        return `
            <div>
                <span class="badge bg-danger">
                    <i class="bi bi-x-circle"></i> Habis
                </span>
            </div>
        `;
    } else if (totalPsg < 240) { // Kurang dari 10 DZ
        return `
            <div>
                <span class="badge bg-warning text-dark">
                    <i class="bi bi-exclamation-triangle"></i> Rendah
                </span>
                <div class="small text-muted mt-1">
                    ${dz} DZ ${psg} PSG
                </div>
            </div>
        `;
    } else {
        return `
            <div>
                <span class="badge bg-success">
                    <i class="bi bi-check-circle"></i> Tersedia
                </span>
                <div class="small text-muted mt-1">
                    ${dz} DZ ${psg} PSG
                </div>
            </div>
        `;
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
                    html: `Artikel <b>${product.name || product.product_name}</b> (${barcode})<br>tidak memiliki harga jual yang valid.<br><br>
                           <span class="text-danger">Harga Jual: ${formatMoney(priceSell)}</span><br><br>
                           Silakan hubungi admin untuk mengatur harga jual artikel ini.`,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f1416c'
                });
                return;
            }
            
            // Jika valid, lanjutkan add to cart
            addProductToCart(product);
        }
    } catch (error) {
        console.error('Error validating product:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Gagal memvalidasi produk',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
    // ========== END VALIDASI ==========
}

// ============ INJECT MODAL STYLES ============
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

    const apiUrl = `/api/v1/products/findByBarcode/${barcode}`;

    $.ajax({
        url: apiUrl,
        type: 'GET',
        success: function(response) {
            hideLoader();
            if (response.success) {
                const product = response.product;
                
                // ========== TAMBAHKAN VALIDASI PRICE_SELL DI SINI ==========
                const priceSell = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
                
                if (priceSell <= 0 || product.price_sell === null) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Harga Jual Tidak Valid!',
                        html: `Artikel <b>${product.name || product.product_name}</b> (${barcode})<br>tidak memiliki harga jual yang valid.<br><br>
                               <span class="text-danger">Harga Jual: ${formatMoney(priceSell)}</span><br><br>
                               Silakan hubungi admin untuk mengatur harga jual artikel ini.`,
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#f1416c'
                    });
                    $("#product-search").val('').select();
                    return;
                }
                // ========== END VALIDASI ==========
                
                addProductToCart(product);
                $("#product-search").val('').focus();
            } else {
                toastr.error(response.message || 'Product not found');
                $("#product-search").select();
            }
        },
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
        existingItem.qty += 1;
        existingItem.subtotal = existingItem.qty * parseFloat(existingItem.price_pcs);
        existingItem.hpp_total = existingItem.qty * hpp;
        
        // ✅ Update dengan highlighting (item existing)
        updateCartRowOptimized(existingItem, false);
        
        playSuccessSound();
    } else {
        const newItem = {
            id_product: product.id,
            barcode: product.barcode || '',
            product_name: product.name || product.product_name || 'Produk Tidak Dikenal',
            price_sell: product.price_sell,
            quantity: product.quantity || 0,
            price_pcs: price,
            hpp_pcs: hpp,
            qty: 1,
            subtotal: price,
            hpp_total: hpp
        };

        cartState.items.push(newItem);
        
        // ✅ Add dengan highlighting (item baru)
        addCartRowOptimized(newItem);
        
        playSuccessSound();
    }

    updateCartSummary();
    sortCartTableOptimized();
}

// ============ PART 4: OPTIMIZED addCartRow (GANTI function addCartRow yang lama) ============

function addCartRowOptimized(item) {
    // Remove empty cart message if exists
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

    // ✅ Highlight dengan HighlightManager (item baru)
    requestAnimationFrame(() => {
        HighlightManager.highlight(rowId, true);
    });

    // Scroll to the new row
    scrollToElement(`#${rowId}`);

    // Attach event handlers to the new row
    attachCartEvents(item.id_product);

    // Refocus on barcode input after adding item
    setTimeout(() => {
        $("#product-search").focus();
    }, 100);
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
    addCartRowOptimized(item);
}

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
    
    // ✅ Highlight dengan HighlightManager (update item)
    requestAnimationFrame(() => {
        HighlightManager.highlight(rowId, false);
    });

    // Scroll to the updated row
    scrollToElement(`#${rowId}`);

    // Refocus on barcode input
    setTimeout(() => {
        $("#product-search").focus();
    }, 100);
}

// Update existing cart row
function updateCartRow(item) {
    updateCartRowOptimized(item, false);
}
// End: Add & update to detail table

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

// Scroll to element helper
function scrollToElement(selector) {
    const element = $(selector)[0];
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function attachCartEvents(productId) {
    // Quantity increase button
    $(`.qty-increase[data-product-id="${productId}"]`).on('click', function () {
        increaseItemQuantity(productId);
        return false; // Prevent event bubbling
    });

    // Quantity decrease button
    $(`.qty-decrease[data-product-id="${productId}"]`).on('click', function () {
        decreaseItemQuantity(productId);
        return false; // Prevent event bubbling
    });

    // Quantity input change
    $(`.product-qty[data-product-id="${productId}"]`).on('change', function () {
        updateItemQuantity(productId, parseInt($(this).val()) || 1);
    });

    // Remove item button
    $(`.remove-item[data-product-id="${productId}"]`).on('click', function () {
        removeCartItem(productId);
        return false; // Prevent event bubbling
    });
}

// Increase item quantity
// Increase item quantity
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

// Decrease item quantity
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

// Remove item from cart
function removeCartItem(productId) {
    const rowId = `cart-item-${productId}`;
    
    // ✅ Clear highlight timeout
    HighlightManager.clearTimeout(rowId);
    
    // Remove from state
    cartState.items = cartState.items.filter(item => item.id_product !== productId);

    // Remove from DOM with animation
    const row = document.getElementById(rowId);
    if (row) {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            row.remove();

            // Show empty cart message if needed
            if (cartState.items.length === 0) {
                showEmptyCartMessage();
            }

            updateCartSummary();

            // Refocus on barcode input
            $("#product-search").focus();
        }, 300);
    }
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
    sortCartTableOptimized();
}

// Start : Kalkulasi Total
function updateDiscounts() {
    const disc1Percentage = parseFloat($("#discount_percentage").val()) || 0;
    const disc2Percentage = parseFloat($("#discount_percentage2").val()) || 0;
    const disc3Percentage = parseFloat($("#discount_percentage3").val()) || 0;

    // Calculate discounts
    cartState.discount1 = (cartState.bruto * disc1Percentage) / 100;
    const afterDisc1 = cartState.bruto - cartState.discount1;

    cartState.discount2 = (afterDisc1 * disc2Percentage) / 100;
    const afterDisc2 = afterDisc1 - cartState.discount2;

    cartState.discount3 = (afterDisc2 * disc3Percentage) / 100;

    // Calculate netto (final amount after all discounts)
    cartState.netto = afterDisc2 - cartState.discount3;

    // Update display
    updateAmountDisplay();
}

function updateAmountDisplay() {
    // Update visible amounts
    $("#bruto-amount").text(`(+) ${formatMoney(cartState.bruto)}`);
    $("#discount-amount").text(`(-) ${formatMoney(cartState.discount1)}`);
    $("#discount-amount2").text(`(-) ${formatMoney(cartState.discount2)}`);
    $("#discount-amount3").text(`(-) ${formatMoney(cartState.discount3)}`);
    $("#netto-amount").text(formatMoney(cartState.netto));
    $("#hpp-amount").text(`(+) ${formatMoney(cartState.hppAmount)}`);

    // Update hidden inputs
    $("#hppAmount_amount").val(cartState.hpp);
    $("#bruto_amount_input").val(cartState.bruto);
    $("#discount_amount_input").val(cartState.discount1);
    $("#discount_amount2_input").val(cartState.discount2);
    $("#discount_amount3_input").val(cartState.discount3);
    $("#netto_amount_input").val(cartState.netto);
}

// End : Kalkulasi Total

// start : Fungsi submit

function submitForm() {
    showLoadingDialog();

    const formData = new FormData($("#send-form")[0]);

    // Add products data
    cartState.items.forEach((item, index) => {
        appendProductToFormData(formData, item, index);
    });

    // Add summary values
    appendSummaryToFormData(formData);

    // Send the request
    $.ajax({
        url: $("#send-form").attr('action'),
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        success: handleSubmitSuccess,
        error: handleSubmitError
    });
}

function appendProductToFormData(formData, item, index) {
    formData.append(`products[${index}][id_product]`, item.id_product);
    formData.append(`products[${index}][barcode]`, item.barcode);
    formData.append(`products[${index}][product_name]`, item.product_name);
    formData.append(`products[${index}][quantity]`, item.quantity);
    formData.append(`products[${index}][qty]`, item.qty);
    formData.append(`products[${index}][price_pack]`, item.price_pack);
    formData.append(`products[${index}][hpp_pcs]`, item.hpp_pcs);
    formData.append(`products[${index}][subtotal]`, item.subtotal);
    formData.append(`products[${index}][hpp_total]`, item.hpp_total);
}

function appendSummaryToFormData(formData) {
    formData.append('hpp_amount', cartState.hpp);
    formData.append('bruto_amount', cartState.bruto);
    formData.append('discount_amount', cartState.discount1);
    formData.append('discount_amount2', cartState.discount2);
    formData.append('discount_amount3', cartState.discount3);
    formData.append('netto_amount', cartState.netto);
}

function showLoadingDialog() {
    Swal.fire({
        title: 'Menyimpan Perubahan...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
}

function handleSubmitSuccess(response) {
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
        showErrorDialog(response.message || 'Terjadi kesalahan saat memproses permintaan.');
    }
}

function handleSubmitError(xhr, status, error) {
    Swal.close();
    console.error('Error:', xhr.responseText);

    let errorMessage = 'Terjadi kesalahan saat memproses permintaan.';
    if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage = xhr.responseJSON.message;
    }

    showErrorDialog(errorMessage);
}

function showErrorDialog(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: message,
        confirmButtonText: 'OK'
    });
}
// End : Fungsi submit

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