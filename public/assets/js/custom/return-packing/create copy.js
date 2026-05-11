// Purchase Create Script
document.addEventListener('DOMContentLoaded', function () {
    initializeComponents();
    initializeEventListeners();
    showEmptyCartMessage();
    generateInvoiceNumber();
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
    totalPack: 0
};

// ============ QUEUE SYSTEM UNTUK HANDLE MULTIPLE SCANS ============
let scanQueue = [];
let isProcessing = false;
let pendingScans = 0;

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
    // Initialize customer select2
    $('#id_customer').select2({
        placeholder: 'Pilih Pelanggan',
        allowClear: true
    });

    // Handle type change untuk show/hide customer & sales
    $('#type').on('change', function() {
        const selectedType = $(this).val();
        
        if (selectedType === 'Toko') {
            $('#customer-field').slideDown();
            $('#sales-field').slideDown();
            $('#id_customer').prop('required', true);
            $('#nama_sales').prop('required', true);
        } else {
            $('#customer-field').slideUp();
            $('#sales-field').slideUp();
            $('#id_customer').prop('required', false).val('').trigger('change');
            $('#nama_sales').prop('required', false).val('');
        }
    });

    // Handle customer change untuk auto-fill sales
    $('#id_customer').on('change', function() {
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
                success: function(response) {
                    if (response.success && response.data) {
                        if (response.data.nama_sales) {
                            $('#nama_sales').val(response.data.nama_sales);
                        }
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching customer:', error);
                }
            });
        } else {
            $('#nama_sales').val('');
        }
    });
}

// validasi input
function initializeFormValidation() {
    $("#return-packing-form").on('submit', validateFormSubmission);

    const form = document.getElementById('return-packing-form');

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
    e.preventDefault();

    let isValid = true;
    let errors = [];

    // Validasi items
    if (cartState.items.length === 0) {
        errors.push('Artikel belum di Scan! Silakan tambahkan artikel terlebih dahulu.');
        isValid = false;
    }

    // Validasi type
    if (!$("#type").val()) {
        errors.push('Silakan pilih Jenis Retur!');
        isValid = false;
    }

    // Validasi customer & sales jika type = Toko
    const selectedType = $("#type").val();
    if (selectedType === 'Toko') {
        if (!$("#id_customer").val()) {
            errors.push('Silakan pilih Pelanggan!');
            isValid = false;
        }
        if (!$("#nama_sales").val().trim()) {
            errors.push('Silakan isi Nama Sales!');
            isValid = false;
        }
    }

    // Tampilkan error jika ada
    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    // Jika valid, submit form
    submitForm();
    return false;
}

function initializeEventListeners() {
    // Remove old event handlers
    $("#product-search").off('keypress keyup input keydown');
    
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

    // Barcode scanner biasanya input sangat cepat (< 100ms per karakter)
    // Manual typing biasanya > 200ms per karakter
    cartState.barcodeTimer = setTimeout(function() {
        if (searchValue.length >= 3) {
            // Add to queue instead of direct search
            scanQueue.push(searchValue);
            $('#product-search').val(''); // Clear input immediately
            
            // Start processing queue
            processQueue();
        }
    }, 150); // Reduced timeout untuk faster response
}

// Handle Enter key
function handleEnterKey(e) {
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
            success: function(response) {
                if (response.success) {
                    addProductToCart(response.product);
                    resolve(response.product);
                } else {
                    showCompactNotification(`⚠ ${barcode} tidak ditemukan`, 'warning');
                    reject(response.message || 'Product not found');
                }
            },
            error: function(xhr, status, error) {
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
        error: '#f1416c'
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
    }, 1000);
}

function addProductToCart(product) {
    const price = parseFloat(product.cogs?.toString().replace(/[^\d.-]/g, '')) || 0;
    const hpp = parseFloat(product.price?.toString().replace(/[^\d.-]/g, '')) || 0;

    const existingItemIndex = cartState.items.findIndex(item => item.id_product === product.id);

    if (existingItemIndex !== -1) {
        const existingItem = cartState.items[existingItemIndex];
        existingItem.qty += 1;
        existingItem.subtotal = existingItem.qty * parseFloat(existingItem.price_pcs);
        existingItem.hpp_total = existingItem.qty * hpp;
        updateCartRow(existingItem);
        playSuccessSound();
        
        // Compact notification untuk update
        showCompactNotification(`+1 ${product.name} (Total: ${existingItem.qty})`, 'success');
    } else {
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
        
        // Compact notification untuk item baru
        showCompactNotification(`✓ ${product.name}`, 'success');
    }

    updateCartSummary();
    sortCartTable();
}

// Stars: Add & update to detail table
function addCartRow(item) {
    // Remove empty cart message if exists
    $("#empty-cart-row").remove();

    const newRow = `
        <tr id="cart-item-${item.id_product}" class="new-item-highlight">
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

    // Remove highlight after animation
    setTimeout(() => {
        $(`#cart-item-${item.id_product}`).removeClass('new-item-highlight');
    }, 2000);

    // Attach event handlers to the new row
    attachCartEvents(item.id_product);

    // Keep focus on barcode input
    setTimeout(() => {
        $("#product-search").focus();
    }, 50);
}

// Update existing cart row
function updateCartRow(item) {
    const row = $(`#cart-item-${item.id_product}`);

    // Update values
    row.find('.product-qty').val(item.qty);
    row.find('.subtotal-value').text(`${formatMoney(item.subtotal)}`);
    row.find(`input[name="products[${item.id_product}][qty]"]`).val(item.qty);
    row.find(`input[name="products[${item.id_product}][subtotal]"]`).val(item.subtotal);
    row.find(`input[name="products[${item.id_product}][hpp_total]"]`).val(item.hpp_total);

    // Highlight the updated row
    row.addClass('updated-item-highlight');

    // Remove highlight after animation
    setTimeout(() => {
        row.removeClass('updated-item-highlight');
    }, 2000);

    // Keep focus on barcode input
    setTimeout(() => {
        $("#product-search").focus();
    }, 50);
}
// End: Add & update to detail table

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

function attachCartEvents(productId) {
    // Quantity increase button
    $(`.qty-increase[data-product-id="${productId}"]`).on('click', function () {
        increaseItemQuantity(productId);
        return false;
    });

    // Quantity decrease button
    $(`.qty-decrease[data-product-id="${productId}"]`).on('click', function () {
        decreaseItemQuantity(productId);
        return false;
    });

    // Quantity input change
    $(`.product-qty[data-product-id="${productId}"]`).on('change', function () {
        updateItemQuantity(productId, parseInt($(this).val()) || 1);
    });

    // Remove item button
    $(`.remove-item[data-product-id="${productId}"]`).on('click', function () {
        removeCartItem(productId);
        return false;
    });
}

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
    // Calculate HPP total
    cartState.hpp = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.hpp_total) || 0);
    }, 0);

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
    const form = $("#return-packing-form");

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

    // Add products data
    cartState.items.forEach((item, index) => {
        formData.append(`products[${index}][id_product]`, item.id_product);
        formData.append(`products[${index}][barcode]`, item.barcode);
        formData.append(`products[${index}][product_name]`, item.product_name);
        formData.append(`products[${index}][qty]`, item.qty);
        formData.append(`products[${index}][quantity]`, item.quantity);
        formData.append(`products[${index}][price_pack]`, item.cogs);
        formData.append(`products[${index}][hpp_pcs]`, item.hpp_pcs);
        formData.append(`products[${index}][hpp_total]`, item.hpp_total);
        formData.append(`products[${index}][subtotal]`, item.subtotal);
    });

    // Add summary values
    formData.append('hpp_amount', cartState.hpp);
    formData.append('bruto_amount', cartState.bruto);
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
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: response.message,
                    showConfirmButton: true,
                    confirmButtonText: 'OK'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/admin/manufacture/return-packing';
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
    $('#return-packing-form')[0].reset();

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