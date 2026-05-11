// Purchase Create Script
// // Tambahkan event listener untuk dropdown jatuh tempo
// const dueDateOption = document.getElementById('due_date_option');
// const customDueDateGroup = document.getElementById('custom_due_date_group');

// if (dueDateOption) {
//     dueDateOption.addEventListener('change', function() {
//         if (this.value === 'custom') {
//             console.log('asdasda');
            
//             customDueDateGroup.style.display = 'block';
//         } else {
//             customDueDateGroup.style.display = 'none';
//             // Clear date input if needed
//             const tglFaktur = document.querySelector('input[name="due_date"]');
//             if (tglFaktur) {
//                 tglFaktur.value = "{{ now()->format('Y-m-d') }}";
//             }
//         }
//     });
// }

document.addEventListener('DOMContentLoaded', function () {
    // Existing functions
    initializeComponents();
    initializeEventListeners();
    showEmptyCartMessage();
    generateOrderCode();
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

// Initialize all components
function initializeComponents() {
    // initializeTransactionChangeHandler();
    initializeSelect2();
    initializeFormValidation();
}

// Handle changes in transaction type and item type
// function initializeTransactionChangeHandler() {
//     $('#j_transaksi, #jenis_barang').change(function () {
//         const jTransaksi = $('#j_transaksi').val();
//         const jenisBarang = $('#jenis_barang option:selected').data('nama');

//         if (jTransaksi && jenisBarang) {
//             cartState.transactionType = jTransaksi;
//             cartState.itemType = jenisBarang;
//             generateInvoiceNumber(jTransaksi, jenisBarang);
//         }
//     });
// }

// // AJAX request to generate invoice number
// function generateInvoiceNumber(jTransaksi, jenisBarang) {
//     $.ajax({
//         url: generateSendNumberUrl,
//         type: 'POST',
//         headers: {
//             'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
//         },
//         data: {
//             jenis_trans: jTransaksi,
//             jenis_barang: jenisBarang
//         },
//         dataType: 'json',
//         success: function (response) {
//             cartState.invoiceNumber = response.no_faktur;
//             $('#no_faktur').val(response.no_faktur);
//         },
//         error: function (xhr, status, error) {
//             console.error('Error:', error);
//             Swal.fire({
//                 text: 'Gagal generate nomor faktur',
//                 icon: 'error',
//                 toast: true,
//                 showConfirmButton: false,
//                 position: 'top-end',
//                 timer: 3000
//             });
//         }
//     });
// }

function generateOrderCode(jTransaksi, jenisBarang) {
    $.ajax({
        url: generateOrderCodeUrl,
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        dataType: 'json',
        success: function (response) {
            $('#code').val(response.code);
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
            // Get customer details
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
            
            // Get customer receivables
            $.ajax({
                url: getCustomerReceivables,
                type: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                data: {
                    customer_id: selectedCustomerId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.receivables && response.receivables.length > 0) {
                        // Buat tabel untuk menampilkan piutang
                        var receivablesHtml = `
                            <div class="alert alert-info">
                                <strong>Total Piutang Keseluruhan:</strong> Rp${formatRupiah(response.total_all_receivables)}
                                ${response.total_receivables_count > 3 ? `<br><small>(Menampilkan 3 dari ${response.total_receivables_count} faktur)</small>` : ''}
                            </div>
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>No. Faktur</th>
                                        <th>Tanggal</th>
                                        <th>Total Piutang</th>
                                        <th>Sisa Piutang</th>
                                        <th>Status Piutang</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;

                        response.receivables.forEach(function(receivable) {
                            receivablesHtml += `
                                <tr>
                                    <td>${receivable.no_faktur}</td>
                                    <td>${receivable.create_date}</td>
                                    <td>Rp${formatRupiah(receivable.netto)}</td>
                                    <td>Rp${formatRupiah(receivable.sisa_piutang)}</td>
                                    <td>${receivable.stpiutang}</td>
                                </tr>
                            `;
                        });

                        receivablesHtml += `
                                </tbody>
                            </table>
                        `;

                        // Tambahkan tombol untuk melihat semua piutang jika lebih dari 3
                        if (response.total_receivables_count > 3) {
                            receivablesHtml += `
                                <button id="show_all_receivables" class="btn btn-secondary" 
                                        data-customer-id="${selectedCustomerId}">
                                    Lihat Semua Piutang (${response.total_receivables_count} Faktur)
                                </button>
                            `;
                        }

                        // Tampilkan di container
                        $('#customer_receivables_modal').html(receivablesHtml).show();

                        // Tambahkan event listener untuk tombol "Lihat Semua Piutang"
                        $('#show_all_receivables').on('click', function() {
                            const customerId = $(this).data('customer-id');
                            window.open("{{ url('sales/order/all-receivables') }}/" + customerId, '_blank');
                        });
                    } else {
                        $('#customer_receivables_modal').html('<p>Tidak ada piutang.</p>').show();
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching receivables:', error);
                    $('#customer_receivables_modal').html('<p>Gagal memuat data piutang.</p>').show();
                }
            });
            
            // Get customer invoice notes 
            $.ajax({
                url: getCustomerReceivables,
                type: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                data: {
                    customer_id: selectedCustomerId
                },
                dataType: 'json',
                success: function(response) {
                    // Check if there's a generated note
                    if (response.auto_note) {
                        // Populate the textarea with the generated note
                        $('#note').val(response.auto_note);
                    } else {
                        // Clear the note if no issues found
                        $('#note').val('');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching invoice notes:', error);
                    // Optionally show an error message to the user
                    $('#note').val('Gagal mengambil catatan invoice');
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
                        $('#discount_percentage_disp').text(discountValue);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error fetching customer discounts:', error);
                }
            });
        }
    });
}

// Fungsi untuk format angka menjadi format rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// validasi input
// function initializeFormValidation() {
//     $("#sales-order-form").on('submit', validateFormSubmission);

//     const form = document.getElementById('sales-order-form');

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

function initializeFormValidation() {
    $("#sales-order-form").on('submit', validateFormSubmission);
    
    const form = document.getElementById('sales-order-form');
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
    $("#product-search").on('keypress', handleBarcodeInput);

    $("#product-search").on('keyup', handleBarcodeScanner);

    $("#discount_percentage").on('input', updateDiscounts);
    $("#discount_percentage2").on('input', updateDiscounts);
    $("#discount_percentage3").on('input', updateDiscounts);
}

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
        existingItem.qty += 1;
        existingItem.subtotal = existingItem.qty * parseFloat(existingItem.price_pcs);
        existingItem.hpp_total = existingItem.qty * hpp;
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
            qty: 1,
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
    // Remove empty cart message if exists
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

    // Scroll to the new row and highlight it
    scrollToElement(`#cart-item-${item.id_product}`);

    // Remove highlight after animation
    setTimeout(() => {
        $(`#cart-item-${item.id_product}`).removeClass('new-item-highlight');
    }, 2000);

    // Attach event handlers to the new row
    attachCartEvents(item.id_product);

    // Refocus on barcode input after adding item
    setTimeout(() => {
        $("#product-search").focus();
    }, 100);
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

// function submitForm() {
//     const form = $("#sales-order-form");
//     // Show loading state
//     Swal.fire({
//         title: 'Menyimpan...',
//         allowOutsideClick: false,
//         showConfirmButton: false,
//         willOpen: () => {
//             Swal.showLoading();
//         }
//     });
//     // Gather all form data, not just products
//     const formData = new FormData(form[0]);
//     // Add products data
//     cartState.items.forEach((item, index) => {
//         formData.append(`products[${index}][id_product]`, item.id_product);
//         formData.append(`products[${index}][barcode]`, item.barcode);
//         formData.append(`products[${index}][product_name]`, item.product_name);
       
//         // Exactly match controller's keys
//         formData.append(`products[${index}][quantity]`, item.qty);
//         formData.append(`products[${index}][quantity_pack]`, item.quantity);
//         formData.append(`products[${index}][quantity_pcs]`, item.quantity);
       
//         formData.append(`products[${index}][price_pack]`, item.price_sell);
//         formData.append(`products[${index}][price_pcs]`, item.price_pcs);
       
//         // Add sub_total as expected by controller
//         formData.append(`products[${index}][sub_total]`, item.subtotal);
        
//         // Add subtotal_ps_detail if needed
//         formData.append(`products[${index}][subtotal_ps_detail]`, item.subtotal);
       
//         // Optional: Add other fields as needed
//         formData.append(`products[${index}][product_discount_amount]`, 0);
//         formData.append(`products[${index}][product_tax_amount]`, 0);
//     });
//     // Add summary values
//     formData.append('bruto_amount', cartState.bruto);
//     formData.append('discount_percentage', cartState.discount1Percentage || 0);
//     formData.append('discount_amount', cartState.discount1 || 0);
//     formData.append('discount_percentage_2', cartState.discount2Percentage || 0);
//     formData.append('discount_amount_2', cartState.discount2 || 0);
//     formData.append('discount_percentage_3', cartState.discount3Percentage || 0);
//     formData.append('discount_amount_3', cartState.discount3 || 0);
//     formData.append('netto_amount', cartState.netto);
//     formData.append('shipping_amount', 0); // Add if applicable
//     formData.append('tax_amount', 0); // Add if applicable
   
//     // Send the request
//     $.ajax({
//         url: form.attr('action'),
//         type: 'POST',
//         data: formData,
//         processData: false,
//         contentType: false,
//         headers: {
//             'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
//         },
//         success: function (response) {
//             Swal.close();
//             if (response.success) {
//                 Swal.fire({
//                     icon: 'success',
//                     title: 'Berhasil!',
//                     text: response.message,
//                     showConfirmButton: true,
//                     confirmButtonText: 'OK'
//                 }).then((result) => {
//                     if (result.isConfirmed) {
//                         window.location.href = '/admin/inventory/send-manual';
//                     }
//                 });
//             } else {
//                 Swal.fire({
//                     icon: 'error',
//                     title: 'Error!',
//                     text: response.message || 'Terjadi kesalahan saat memproses permintaan.',
//                     confirmButtonText: 'OK'
//                 });
//             }
//         },
//         error: function (xhr, status, error) {
//             Swal.close();
//             console.error('Error:', xhr.responseText);
//             let errorMessage = 'Terjadi kesalahan saat memproses permintaan.';
//             if (xhr.responseJSON && xhr.responseJSON.message) {
//                 errorMessage = xhr.responseJSON.message;
//             }
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Error!',
//                 text: errorMessage,
//                 confirmButtonText: 'OK'
//             });
//         }
//     });
// }

function submitForm() {
    const form = $("#sales-order-form");

    // Show loading state
    Swal.fire({
        title: 'Menyimpan...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    // Gabungkan produk berdasarkan ID untuk mencegah duplikasi
    const uniqueProducts = cartState.items.reduce((acc, item) => {
        const existingItem = acc.find(product => product.id_product === item.id_product);
        
        if (existingItem) {
            // Jika produk sudah ada, tambahkan kuantitas
            existingItem.qty += item.qty;
            existingItem.subtotal += item.subtotal;
            existingItem.hpp_total += item.hpp_total;
        } else {
            // Jika produk belum ada, tambahkan ke daftar
            acc.push({...item});
        }
        
        return acc;
    }, []);

    // Gather all form data, not just products
    const formData = new FormData(form[0]);

    // Add products data
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
                        window.location.href = '/admin/crm/sales-order';
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
    $('#sales-order-form')[0].reset();

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