// Edit Send Packing Script
document.addEventListener('DOMContentLoaded', function () {
    // ✅ TAMBAH: Inject modal styles
    if (!document.getElementById('product-modal-styles')) {
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }

    initializeComponents();
    initializeEventListeners();
    loadExistingShippingData();
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

// Global variable untuk modal state (F1 Search)
let productSearchModal = null;
let productSearchTimeout = null;

// Initialize all components
function initializeComponents() {
    initializeSelect2();
    initializeFormValidation();
}

function loadExistingShippingData() {
    const pathSegments = window.location.pathname.split('/');
    const shippingId = pathSegments[pathSegments.length - 2];
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    // Show loading indicator
    Swal.fire({
        title: 'Memuat Data...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    $.ajax({
        url: `/api/v1/send-packing/${shippingId}/details`,
        type: 'GET',
        headers: {
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
        },
        success: function (response) {
            Swal.close();

            if (response.success) {
                const shipping = response.send;
                const details = response.send_details;

                // Set form fields
                $('#id_warehouse').val(shipping.id_warehouse_from).trigger('change');
                $('#no_faktur').val(shipping.no_faktur);
                $('#tgl_faktur').val(shipping.tgl_faktur);
                $('#id_cust').val(shipping.id_cust).trigger('change');
                $('#cust_name').val(shipping.cust_name);
                $('#cust_phone').val(shipping.cust_phone);
                $('#address_name').val(shipping.cust_address);
                $('#rt_rw').val(shipping.cust_rt_rw);
                $('#kel').val(shipping.cust_kel);
                $('#kec').val(shipping.cust_kec);
                $('#kota_kab').val(shipping.cust_kota_kab);
                $('#provinsi').val(shipping.cust_kota_provinsi);
                $('#note').val(shipping.note);

                // Set hidden fields
                $('#j_transaksi').val(shipping.j_transaksi);
                $('#jenis_barang').val(shipping.id_jenis_barang);
                $('#idemployee').val(shipping.idemployee);
                $('#no_po').val(shipping.no_po);

                // Set discount percentages
                $('#discount_percentage').val(shipping.discount_percentage || 0);
                $('#discount_percentage2').val(shipping.discount_percentage_2 || 0);
                $('#discount_percentage3').val(shipping.discount_percentage_3 || 0);

                // Store original amounts
                cartState.bruto = parseFloat(shipping.bruto_amount) || 0;
                cartState.discount1 = parseFloat(shipping.discount_amount) || 0;
                cartState.discount2 = parseFloat(shipping.discount_amount_2) || 0;
                cartState.discount3 = parseFloat(shipping.discount_amount_3) || 0;
                cartState.netto = parseFloat(shipping.netto_amount) || 0;
                cartState.hppAmount = parseFloat(shipping.hpp_amount) || 0;
                cartState.hpp = parseFloat(shipping.hpp_amount) || 0;

                // Clear items
                cartState.items = [];
                $("#cart-body").empty();

                // Load items into cart
                if (details && details.length > 0) {
                    details.forEach(detail => {
                        const item = {
                            id_product: detail.id_product,
                            barcode: detail.barcode || '',
                            product_name: detail.product_name,
                            price_sell: parseFloat(detail.price_pack || 0),
                            price_pcs: parseFloat(detail.price_pack || 0),
                            quantity: parseInt(detail.stock_quantity || 0),
                            qty: parseInt(detail.quantity_pack || 0),
                            qty_pcs: parseInt(detail.quantity_pcs || 0),
                            subtotal: parseFloat(detail.sub_total || 0),
                            subtotal_ps_detail: parseFloat(detail.subtotal_ps_detail || 0),
                            hpp_pcs: parseFloat(detail.hpp || 0),
                            hpp_total: parseFloat(detail.hpp || 0) * parseInt(detail.quantity_pack || 0),
                            price_pack: parseFloat(detail.price_pack || 0),
                            note: detail.note || ''
                        };

                        cartState.items.push(item);
                        addCartRow(item);
                    });

                    // Update summary without recalculating HPP
                    updateCartSummaryWithoutHPP();
                } else {
                    showEmptyCartMessage();
                }
            } else {
                showErrorToast('Data pengiriman tidak ditemukan!');
            }
        },
        error: function (xhr, status, error) {
            Swal.close();
            console.error('Error loading shipping data:', error);

            let errorMessage = 'Gagal memuat data pengiriman';
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

function updateCartSummaryWithoutHPP() {
    // Calculate Bruto (total before discounts)
    cartState.bruto = cartState.items.reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
    }, 0);

    // Calculate total pack
    cartState.totalPack = cartState.items.reduce((sum, item) => {
        return sum + (parseInt(item.qty) || 0);
    }, 0);

    // Update displays
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

    // Update displays
    $("#total-pack").text(cartState.totalPack);
    $("#total_pack").val(cartState.totalPack);
    $("#total-amount").text(formatMoney(cartState.bruto));

    // Update discount calculations
    updateDiscounts();
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
                        $('#cust_phone').val(response.data.telp || '');
                        $('#address_name').val(response.data.alamat);
                        $('#rt_rw').val(response.data.rt_rw || '');
                        $('#kel').val(response.data.kelurahan);
                        $('#kec').val(response.data.kecamatan);
                        $('#kota_kab').val(response.data.idkota);
                        $('#provinsi').val(response.data.provinsi);
                    } else {
                        toastr.warning('Data pelanggan tidak ditemukan!');
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error:', error);
                    toastr.error('Gagal mengambil data pelanggan!');
                }
            });
        }
    });
}

function initializeFormValidation() {
    $("#send-packing-form").on('submit', validateFormSubmission);
}

function validateFormSubmission(e) {
    e.preventDefault();

    let isValid = true;
    let errors = [];

    // Validate items
    if (cartState.items.length === 0) {
        errors.push('Artikel belum ditambahkan! Silakan tambahkan artikel terlebih dahulu.');
        isValid = false;
    }

    // Validate warehouse
    if (!$('#id_warehouse').val()) {
        errors.push('Gudang harus dipilih!');
        isValid = false;
    }

    // Validate customer
    if (!$('#id_cust').val()) {
        errors.push('Pelanggan harus dipilih!');
        isValid = false;
    }

    // Show errors if any
    if (!isValid) {
        errors.forEach(error => toastr.error(error));
        return false;
    }

    // If valid, submit form
    submitForm();
    return false;
}

// Tambahkan di initializeEventListeners()
function initializeEventListeners() {
    initializeF1ProductSearch();
    
    $("#product-search").on('keypress', handleBarcodeInput);
    $("#product-search").on('keyup', handleBarcodeScanner);
    $("#discount_percentage").on('input', updateDiscounts);
    $("#discount_percentage2").on('input', updateDiscounts);
    $("#discount_percentage3").on('input', updateDiscounts);
    
    // ✅ TAMBAHAN: Warning jika ubah warehouse setelah ada produk
    $('#id_warehouse').on('change', function() {
        if (cartState.items.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian!',
                text: 'Mengubah gudang akan menghapus semua artikel yang sudah ditambahkan. Lanjutkan?',
                showCancelButton: true,
                confirmButtonText: 'Ya, Hapus Semua',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Clear cart
                    cartState.items = [];
                    $("#cart-body").empty();
                    showEmptyCartMessage();
                    updateCartSummary();
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Semua artikel telah dihapus',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } else {
                    // Revert warehouse selection
                    $(this).val($(this).data('previous-value')).trigger('change.select2');
                }
            });
        }
        
        // Store current value for revert
        $(this).data('previous-value', $(this).val());
    });
    
    // Initialize previous value on page load
    $('#id_warehouse').data('previous-value', $('#id_warehouse').val());
}

function handleBarcodeInput(e) {
    if (e.which == 13) {
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

    if (currentTime - cartState.lastKeypressTime < 50 && keyCode >= 32 && keyCode <= 126) {
        if (cartState.barcodeTimer) {
            clearTimeout(cartState.barcodeTimer);
        }

        cartState.barcodeBuffer += String.fromCharCode(keyCode);

        cartState.barcodeTimer = setTimeout(() => {
            if (cartState.barcodeBuffer.length >= 5) {
                searchProductByBarcode(cartState.barcodeBuffer);
                $("#product-search").val('');
            }
            cartState.barcodeBuffer = '';
        }, 50);
    } else {
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
        success: handleProductSearchSuccess,
        error: handleProductSearchError
    });
}

function handleProductSearchSuccess(response) {
    hideLoader();
    if (response.success) {
        addProductToCart(response.product);
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

function showLoader() {
    $("#search-results").html('<div class="d-flex justify-content-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>');
}

function hideLoader() {
    $("#search-results").html('');
}

function addProductToCart(product) {
    const price = parseFloat(product.price_sell?.toString().replace(/[^\d.-]/g, '')) || 0;
    const hpp = parseFloat(product.cogs?.toString().replace(/[^\d.-]/g, '')) || 0;

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
            qty_pcs: 0,
            subtotal: price,
            subtotal_ps_detail: 0,
            hpp_total: hpp,
            price_pack: price,
            note: ''
        };

        cartState.items.push(newItem);
        addCartRow(newItem);
        playSuccessSound();
    }

    updateCartSummary();
    sortCartTable();
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
                    value="${item.qty}" min="1" style="width: 60px;">
                    <span class="input-group-text btn btn-sm btn-secondary qty-increase" data-product-id="${item.id_product}">+</span>
                </div>
                <input type="hidden" name="products[${item.id_product}][id_product]" value="${item.id_product}">
                <input type="hidden" name="products[${item.id_product}][barcode]" value="${item.barcode}">
                <input type="hidden" name="products[${item.id_product}][product_name]" value="${item.product_name}">
                <input type="hidden" name="products[${item.id_product}][quantity]" value="${item.quantity}">
                <input type="hidden" name="products[${item.id_product}][qty]" value="${item.qty}">
                <input type="hidden" name="products[${item.id_product}][qty_pcs]" value="${item.qty_pcs || 0}">
                <input type="hidden" name="products[${item.id_product}][price_pack]" value="${item.price_pack}">
                <input type="hidden" name="products[${item.id_product}][price_pcs]" value="${item.price_pcs || 0}">
                <input type="hidden" name="products[${item.id_product}][subtotal]" value="${item.subtotal}">
                <input type="hidden" name="products[${item.id_product}][subtotal_ps_detail]" value="${item.subtotal_ps_detail || 0}">
                <input type="hidden" name="products[${item.id_product}][hpp_pcs]" value="${item.hpp_pcs}">
                <input type="hidden" name="products[${item.id_product}][hpp_total]" value="${item.hpp_total}">
                <input type="hidden" name="products[${item.id_product}][note]" value="${item.note || ''}">
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
    scrollToElement(`#cart-item-${item.id_product}`);

    setTimeout(() => {
        $(`#cart-item-${item.id_product}`).removeClass('new-item-highlight');
    }, 2000);

    attachCartEvents(item.id_product);

    setTimeout(() => {
        $("#product-search").focus();
    }, 100);
}

function updateCartRow(item) {
    const row = $(`#cart-item-${item.id_product}`);

    row.find('.product-qty').val(item.qty);
    row.find('.subtotal-value').text(`${formatMoney(item.subtotal)}`);
    row.find(`input[name="products[${item.id_product}][qty]"]`).val(item.qty);
    row.find(`input[name="products[${item.id_product}][subtotal]"]`).val(item.subtotal);
    row.find(`input[name="products[${item.id_product}][hpp_total]"]`).val(item.hpp_total);

    row.addClass('updated-item-highlight');
    scrollToElement(`#cart-item-${item.id_product}`);

    setTimeout(() => {
        row.removeClass('updated-item-highlight');
    }, 2000);

    setTimeout(() => {
        $("#product-search").focus();
    }, 100);
}

function scrollToElement(selector) {
    const element = $(selector)[0];
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function attachCartEvents(productId) {
    $(`.qty-increase[data-product-id="${productId}"]`).off('click').on('click', function () {
        increaseItemQuantity(productId);
        return false;
    });

    $(`.qty-decrease[data-product-id="${productId}"]`).off('click').on('click', function () {
        decreaseItemQuantity(productId);
        return false;
    });

    $(`.product-qty[data-product-id="${productId}"]`).off('change').on('change', function () {
        updateItemQuantity(productId, parseInt($(this).val()) || 1);
    });

    $(`.remove-item[data-product-id="${productId}"]`).off('click').on('click', function () {
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

function showEmptyCartMessage() {
    $("#cart-body").html(`
        <tr id="empty-cart-row">
            <td colspan="7" class="text-center">
                <div class="alert alert-warning">
                    Belum ada artikel yang ditambahkan
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

    // Calculate discounts
    cartState.discount1 = (cartState.bruto * disc1Percentage) / 100;
    const afterDisc1 = cartState.bruto - cartState.discount1;

    cartState.discount2 = (afterDisc1 * disc2Percentage) / 100;
    const afterDisc2 = afterDisc1 - cartState.discount2;

    cartState.discount3 = (afterDisc2 * disc3Percentage) / 100;

    // Calculate netto
    cartState.netto = afterDisc2 - cartState.discount3;

    updateAmountDisplay();
}

function updateAmountDisplay() {
    $("#bruto-amount").text(`(+) ${formatMoney(cartState.bruto)}`);
    $("#discount-amount").text(`(-) ${formatMoney(cartState.discount1)}`);
    $("#discount-amount2").text(`(-) ${formatMoney(cartState.discount2)}`);
    $("#discount-amount3").text(`(-) ${formatMoney(cartState.discount3)}`);
    $("#netto-amount").text(formatMoney(cartState.netto));
    $("#hpp-amount").text(`(+) ${formatMoney(cartState.hppAmount)}`);

    $("#hpp_amount").val(cartState.hpp);
    $("#bruto_amount").val(cartState.bruto);
    $("#discount_amount").val(cartState.discount1);
    $("#discount_amount2").val(cartState.discount2);
    $("#discount_amount3").val(cartState.discount3);
    $("#netto_amount").val(cartState.netto);
}

function submitForm() {
    showLoadingDialog();

    const formData = new FormData($("#send-packing-form")[0]);

    // Add products data
    cartState.items.forEach((item, index) => {
        appendProductToFormData(formData, item, index);
    });

    // Add summary values
    appendSummaryToFormData(formData);

    $.ajax({
        url: $("#send-packing-form").attr('action'),
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
    formData.append(`products[${index}][qty_pcs]`, item.qty_pcs || 0);
    formData.append(`products[${index}][price_pack]`, item.price_pack);
    formData.append(`products[${index}][price_pcs]`, item.price_pcs || 0);
    formData.append(`products[${index}][hpp_pcs]`, item.hpp_pcs);
    formData.append(`products[${index}][subtotal]`, item.subtotal);
    formData.append(`products[${index}][subtotal_ps_detail]`, item.subtotal_ps_detail || 0);
    formData.append(`products[${index}][hpp_total]`, item.hpp_total);
    formData.append(`products[${index}][note]`, item.note || '');
}

function appendSummaryToFormData(formData) {
    formData.append('hpp_amount', cartState.hpp);
    formData.append('bruto_amount', cartState.bruto);
    formData.append('discount_amount', cartState.discount1);
    formData.append('discount_amount2', cartState.discount2);
    formData.append('discount_amount3', cartState.discount3);
    formData.append('total_discount_amount', cartState.discount1 + cartState.discount2 + cartState.discount3);
    formData.append('netto_amount', cartState.netto);
    formData.append('total_pack', cartState.totalPack);
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
        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: response.message,
            showConfirmButton: true,
            confirmButtonText: 'OK'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/admin/manufacture/send-packing';
            }
        });
    } else {
        // showErrorDialog(response.message || 'Terjadi kesalahan saat memproses permintaan.');
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: response.message || 'Terjadi kesalahan saat memproses permintaan.',
            confirmButtonText: 'OK'
        });
    }
}

function handleSubmitError(xhr, status, error) {
    Swal.close();
    console.error('Error:', xhr.responseText);

    let errorMessage = 'Terjadi kesalahan saat memproses permintaan.';
    if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage = xhr.responseJSON.message;
    }

    // showErrorDialog(errorMessage);
    Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: errorMessage || 'Terjadi kesalahan saat memproses permintaan.',
        confirmButtonText: 'OK'
    });
}

function showErrorDialog(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: message,
        confirmButtonText: 'OK'
    });
}

function showErrorToast(message) {
    toastr.error(message);
}

// ============ F1 PRODUCT SEARCH MODAL FUNCTIONS ============

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
    
    // ✅ AMBIL ID WAREHOUSE
    const warehouseId = $('#id_warehouse').val();
    
    // ✅ VALIDASI WAREHOUSE HARUS DIPILIH
    if (!warehouseId) {
        Swal.fire({
            icon: 'warning',
            title: 'Perhatian',
            text: 'Silakan pilih Gudang terlebih dahulu!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        $('#productSearchModal').modal('hide');
        return;
    }

    $loadingIndicator.show();
    $productsList.hide();
    $emptyState.hide();

    try {
        console.log('Loading products with query:', searchQuery, 'warehouse:', warehouseId);

        const response = await $.ajax({
            url: '/api/v1/products/search-for-packing', // ✅ Endpoint sudah benar
            type: 'GET',
            data: {
                search: searchQuery,
                limit: 15,
                set_sell: 1,
                id_warehouse: warehouseId  // ✅ KIRIM WAREHOUSE ID
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
        const hppPcs = product.price || 0; // HPP dari product.price
        const stockDz = product.stock_dz || 0;
        const stockPsg = product.stock_psg || 0;
        const color = product.color || '';
        const size = product.size || '';

        const stockBadge = getStockBadgeWithPsg(stockDz, stockPsg);
        const formattedHpp = formatMoney(hppPcs); // Tampilkan HPP

        const productItem = `
            <a href="javascript:void(0);" 
               class="list-group-item list-group-item-action product-item" 
               data-product-id="${productId}"
               data-barcode="${barcode}">
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
                        <div class="fw-bold text-primary mb-1">${formattedHpp}</div>
                        <small class="text-muted">HPP</small>
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
function selectProductFromModal(barcode) {
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

    // Search and add product
    searchProductByBarcode(barcode);
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

function formatMoney(amount) {
    const cleanAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cleanAmount);
}