// Purchase Create Script
document.addEventListener('DOMContentLoaded', function () {
    initializeComponents();
    initializeEventListeners();
});

// Global state for cart
const cartState = {
    items: [],
    tax: 0,
    discount: 0,
    shipping: 0,
    reference: ''
};

// Initialize all components
function initializeComponents() {
    initializeSelect2();
    generateReference();
    initializeFormValidation();
}

function initializeSelect2() {
    // Initialize supplier select2
    const supplierSelect = $('#supplier_id');
    supplierSelect.select2({
        placeholder: 'Pilih Supplier',
        allowClear: true
    });

    // Disable product search initially
    const productSearch = document.getElementById('product-search');
    productSearch.disabled = true;
    productSearch.placeholder = 'Pilih supplier terlebih dahulu...';

    // Handle supplier change
    supplierSelect.on('change', function() {
        const supplierId = $(this).val();
        const selectedOption = $(this).find('option:selected');
        const topValue = selectedOption.data('top');
        const paymentMethod = document.getElementById('payment_method').value;
        
        // Clear cart items when supplier changes
        cartState.items = [];
        updateCartTable();
        updateTotalCalculations();
        
        if (supplierId) {
            // Enable product search
            productSearch.disabled = false;
            productSearch.placeholder = 'Klik untuk melihat produk...';
            
            // Set TOP value based on payment method
            if (paymentMethod === 'Cash') {
                $('#top').val('0');
                $('#top').prop('readonly', true);
            } else if (topValue) {
                $('#top').val(topValue);
                $('#top').prop('readonly', false);
            } else {
                $('#top').val('');
                $('#top').prop('readonly', false);
            }
            
            // Show products immediately if input is focused
            if (document.activeElement === productSearch) {
                searchProducts('');
            }
        } else {
            // Disable and reset product search
            productSearch.disabled = true;
            productSearch.placeholder = 'Pilih supplier terlebih dahulu...';
            productSearch.value = '';
            clearSearchResults();
            
            // Reset TOP based on payment method
            $('#top').val('');
            $('#top').prop('readonly', false);
        }
    });

    // Handle payment method change
    $('#payment_method').on('change', function() {
        const paymentMethod = $(this).val();
        const selectedSupplier = $('#supplier_id option:selected');
        const topValue = selectedSupplier.data('top');

        if (paymentMethod === 'Cash') {
            $('#top').val('0');
            $('#top').prop('readonly', true);
        } else {
            if (selectedSupplier.val() && topValue) {
                $('#top').val(topValue);
            } else {
                $('#top').val('');
            }
            $('#top').prop('readonly', false);
        }
    });
}

function initializeEventListeners() {
    const searchInput = document.getElementById('product-search');
    const searchResults = document.getElementById('search-results');

    // Show products when input is clicked
    searchInput.addEventListener('click', function(e) {
        const supplierId = document.getElementById('supplier_id').value;
        if (!supplierId) {
            showErrorAlert('Silahkan pilih supplier terlebih dahulu');
            this.blur();
            $('#supplier_id').select2('open');
            return;
        }
        // Langsung cari produk tanpa query
        searchProducts('');
        e.stopPropagation(); // Prevent event bubbling
    });

    // Also show products on focus (for keyboard navigation)
    searchInput.addEventListener('focus', function(e) {
        const supplierId = document.getElementById('supplier_id').value;
        if (!supplierId) {
            showErrorAlert('Silahkan pilih supplier terlebih dahulu');
            this.blur();
            $('#supplier_id').select2('open');
            return;
        }
        // Langsung cari produk tanpa query
        searchProducts('');
        e.stopPropagation(); // Prevent event bubbling
    });

    // Handle input for filtering
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        const supplierId = document.getElementById('supplier_id').value;
        if (supplierId) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts(e.target.value);
            }, 300); // Debounce search
        }
    });

    // Close results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            clearSearchResults();
        }
    });

    // Prevent dropdown from closing when clicking inside search results
    searchResults.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Payment method change handler
    const paymentMethodSelect = document.getElementById('payment_method');
    const topInput = document.getElementById('top');

    paymentMethodSelect.addEventListener('change', function() {
        if (this.value === 'Cash') {
            topInput.value = '0';
            topInput.readOnly = true;
        } else {
            topInput.readOnly = false;
            
            // Ambil TOP dari supplier yang dipilih
            const selectedSupplier = document.querySelector('#supplier_id option:checked');
            if (selectedSupplier) {
                const supplierTop = selectedSupplier.dataset.top;
                if (supplierTop) {
                    topInput.value = supplierTop;
                }
            }
        }
    });

    // Inisialisasi nilai awal saat halaman dimuat
    if (paymentMethodSelect.value === 'Cash') {
        topInput.value = '0';
        topInput.readOnly = true;
    }
}

// Initialize form validation
function initializeFormValidation() {
    const form = document.getElementById('purchase-form');

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

    // Additional validation for paid amount
    const paidAmountInput = document.getElementById('paid_amount');
    if (paidAmountInput) {
        paidAmountInput.addEventListener('input', function () {
            const paidAmount = parseFloat(this.value);
            const totalAmount = calculateTotal();

            if (isNaN(paidAmount) || paidAmount < 0) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            }
        });
    }
}

// Generate unique reference number
function generateReference() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    const reference = `PR${year}${month}${day}${random}`;
    document.querySelector('input[name="reference"]').value = reference;
    cartState.reference = reference;
}

// Initialize all event listeners
function initializeEventListeners() {
    // Search product
    const searchInput = document.getElementById('product-search');
    let searchTimeout;

    searchInput.addEventListener('input', function (e) {
        clearTimeout(searchTimeout);
        const query = e.target.value;

        if (query.length < 2) {
            clearSearchResults();
            return;
        }

        searchTimeout = setTimeout(() => {
            searchProducts(query);
        }, 500);
    });

    // Cart calculations
    document.getElementById('tax_percentage').addEventListener('input', handleTaxChange);
    document.getElementById('discount_percentage').addEventListener('input', handleDiscountChange);
    document.getElementById('shipping_amount').addEventListener('input', handleShippingChange);

    // Get total amount button
    document.getElementById('getTotalAmount').addEventListener('click', function () {
        const totalAmount = calculateTotal();
        document.getElementById('paid_amount').value = totalAmount;
    });

    // Form submission
    document.getElementById('purchase-form').addEventListener('submit', handleFormSubmit);
}

// Product search functions
async function searchProducts(query) {
    try {
        const supplierId = document.getElementById('supplier_id').value;
        if (!supplierId) return;

        const csrfToken = document.querySelector('input[name="_token"]').value;
        
        // Show loading state
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = `
            <div class="card shadow">
                <div class="card-body text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        `;

        // Add active class to search input container
        document.querySelector('.position-relative').classList.add('active');

        const response = await fetch(`/api/v1/products/search?supplier_id=${supplierId}&query=${query}`, {
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const result = await response.json();

        if (result.success) {
            displaySearchResults(result.data);
        } else {
            throw new Error(result.message || 'Error searching products');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('search-results').innerHTML = `
            <div class="card shadow">
                <div class="card-body">
                    <div class="alert alert-danger mb-0">
                        Error saat mencari produk. Silakan coba lagi.
                    </div>
                </div>
            </div>
        `;
    }
}

// Update the displaySearchResults function to handle the updated data structure
function displaySearchResults(products) {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'card shadow';

    if (!products || products.length === 0) {
        resultsContainer.innerHTML = `
            <div class="card-body">
                <div class="alert alert-warning mb-0">
                    <div class="d-flex flex-column">
                        <h4 class="mb-1 text-dark">Produk Tidak Ditemukan</h4>
                        <span>Tidak ada produk untuk supplier ini</span>
                    </div>
                </div>
            </div>`;
        searchResults.appendChild(resultsContainer);
        return;
    }

    const ulElement = document.createElement('ul');
    ulElement.className = 'list-group list-group-flush';
    ulElement.style.maxHeight = '300px';
    ulElement.style.overflowY = 'auto';

    // Add search results count header
    const headerLi = document.createElement('li');
    headerLi.className = 'list-group-item bg-light';
    headerLi.innerHTML = `
        <div class="text-muted">
            Ditemukan ${products.length} produk
        </div>
    `;
    ulElement.appendChild(headerLi);

    products.forEach(product => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action py-3';
        li.dataset.productId = product.id;
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${product.name}</strong>
                    <span class="badge badge-info ml-2">${product.type}</span>
                </div>
                <div>
                    <span class="badge badge-success">${formatMoney(product.price_buy)}</span>
                    <span class="badge badge-warning ml-2">${product.stock} ${product.id_uom}</span>
                </div>
            </div>
        `;
        
        li.style.cursor = 'pointer';
        li.addEventListener('mouseover', function() {
            this.classList.add('bg-light');
        });
        li.addEventListener('mouseout', function() {
            this.classList.remove('bg-light');
        });
        
        li.addEventListener('click', function() {
            addToCart(product);
            clearSearchResults();
            document.getElementById('product-search').value = '';
            // Focus back on product search for next item
            document.getElementById('product-search').focus();
        });

        ulElement.appendChild(li);
    });

    resultsContainer.appendChild(ulElement);
    searchResults.appendChild(resultsContainer);
}

function createProductListItem(product) {
    return `
        <li class="list-group-item list-group-item-action" data-product-id="${product.id}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${product.name}</strong>
                    <span class="badge badge-info ml-2">${product.type}</span>
                </div>
                <div>
                    <span class="badge badge-success">${formatMoney(product.price_buy)}</span>
                    <span class="badge badge-warning ml-2">${product.stock} ${product.unit}</span>
                </div>
            </div>
        </li>
    `;
}

function attachProductClickHandlers(products) {
    document.querySelectorAll('#search-results li').forEach(item => {
        item.addEventListener('click', () => {
            const product = products.find(p => p.id.toString() === item.dataset.productId);
            addToCart(product);
            clearSearchResults();
            document.getElementById('product-search').value = '';
        });
    });
}

// Cart operations
function addToCart(product) {
    const existingItem = cartState.items.find(item => item.product_id === product.id);
    const price = parseFloat(product.price_buy); // Pastikan ini adalah number
    const stock = product.stock !== null ? product.stock : 0;
    
    if (existingItem) {
        existingItem.quantity += 1;
        existingItem.sub_total = existingItem.quantity * existingItem.price;
    } else {
        cartState.items.push({
            product_id: product.id,
            product_name: product.name,
            // product_code: product.barcode || product.code,
            product_code: product.type,
            price: price,
            unit_price: price, // Tambahkan unit_price
            stock: stock,
            unit: product.unit || product.id_uom,
            quantity: 1,
            sub_total: price,
            product_discount_amount: 0,
            product_discount_type: 'fixed',
            product_tax_amount: 0
        });
    }

    updateCartTable();
    updateTotalCalculations();
}

function updateCartQuantity(productId, quantity) {
    const item = cartState.items.find(item => item.product_id === productId);
    if (item) {
        quantity = parseInt(quantity);
        // Hanya validasi untuk memastikan quantity positif
        if (quantity < 1) {
            quantity = 1;
        }
        
        item.quantity = quantity;
        item.sub_total = item.quantity * item.price;
        
        // Update specific row
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (row) {
            // Update quantity input value
            const quantityInput = row.querySelector('.quantity-input');
            quantityInput.value = quantity;
            
            // Update subtotal display
            const subtotalCell = row.querySelector('td:nth-last-child(2)');
            subtotalCell.textContent = formatMoney(item.sub_total);
        }
        
        // Update totals
        updateTotalCalculations();
    }
}

function removeFromCart(productId) {
    cartState.items = cartState.items.filter(item => item.product_id !== productId);
    updateCartTable();
    updateTotalCalculations();
}

// Cart display updates
function updateCartTable() {
    const cartBody = document.getElementById('cart-body');
    
    // Clear the cart body first
    cartBody.innerHTML = '';
    
    if (cartState.items.length === 0) {
        // If no items, show empty cart message
        cartBody.innerHTML = `
            <tr id="empty-cart-row">
                <td colspan="6" class="text-center">
                    <div class="alert alert-warning">
                        Cari dan Pilih Bahan Baku terlebih dahulu
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Add all items to cart
    cartBody.innerHTML = cartState.items.map(item => createCartRow(item)).join('');
    
    // Attach event listeners to new elements
    attachCartEventListeners();
}

function createCartRow(item) {
    return `
        <tr data-product-id="${item.product_id}">
            <td class="align-middle">
                ${item.product_name}
                <br>
                <span class="badge badge-success">${item.product_code}</span>
            </td>
            <td class="align-middle text-center">${formatMoney(item.price)}</td>
            <td class="align-middle text-center">
                <span class="badge badge-info">${item.stock} ${item.unit}</span>
            </td>
            <td class="align-middle text-center" style="width: 100px;">
                <input type="number" class="form-control form-control-sm quantity-input" 
                       value="${item.quantity}" min="1"
                       style="width: 80px; margin: 0 auto;">
            </td>
            <td class="align-middle text-center">${formatMoney(item.sub_total)}</td>
            <td class="align-middle text-center">
                <button class="btn btn-danger btn-sm remove-item">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function attachCartEventListeners() {
    // Quantity input handlers
    document.querySelectorAll('.quantity-input').forEach(input => {
        // Handle change event
        input.addEventListener('change', function(e) {
            const productId = parseInt(this.closest('tr').dataset.productId);
            updateCartQuantity(productId, this.value);
        });

        // Handle input event for real-time updates
        input.addEventListener('input', function(e) {
            const value = parseInt(this.value);
            const productId = parseInt(this.closest('tr').dataset.productId);
            
            // Validate input
            if (value && value > 0) {
                updateCartQuantity(productId, value);
            }
        });
    });

    // Remove item handlers
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.closest('tr').dataset.productId);
            removeFromCart(productId);
        });
    });
}

// Calculations
function handleTaxChange(e) {
    cartState.tax = parseFloat(e.target.value) || 0;
    updateTotalCalculations();
}

function handleDiscountChange(e) {
    cartState.discount = parseFloat(e.target.value) || 0;
    updateTotalCalculations();
}

function handleShippingChange(e) {
    cartState.shipping = parseFloat(e.target.value) || 0;
    updateTotalCalculations();
}

function calculateSubtotal() {
    return cartState.items.reduce((sum, item) => sum + item.sub_total, 0);
}

function calculateTotal() {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * cartState.tax) / 100;
    const discountAmount = (subtotal * cartState.discount) / 100;
    return subtotal + taxAmount - discountAmount + cartState.shipping;
}

function updateTotalCalculations() {
    const subtotal = calculateSubtotal();
    const taxPercentage = cartState.tax;
    
    // Calculate tax amount from included tax
    // const taxAmount = (subtotal * taxPercentage) / (100 + taxPercentage);
    const taxAmount = (subtotal * taxPercentage) / 100;
    const priceWithoutTax = subtotal - taxAmount;
    
    const discountAmount = (subtotal * cartState.discount) / 100;
    const total = subtotal - discountAmount + cartState.shipping;

    // Update display
    document.getElementById('tax-amount').textContent = `(included) ${formatMoney(taxAmount)}`;
    document.getElementById('price-without-tax').textContent = `${formatMoney(priceWithoutTax)}`;
    document.getElementById('discount-amount').textContent = `(-) ${formatMoney(discountAmount)}`;
    document.getElementById('shipping-amount').textContent = `(+) ${formatMoney(cartState.shipping)}`;
    document.getElementById('total-amount').textContent = formatMoney(total);
    document.getElementById('total_amount_input').value = total;
    document.getElementById('price_no_tax_input').value = priceWithoutTax;
}

// Form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    try {
        const formData = createFormData();
        console.log('Sending data:', formData); // Untuk debugging

        const response = await fetch(e.target.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
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

// Utility functions
function formatMoney(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function validateForm() {
    if (cartState.items.length === 0) {
        showErrorAlert('Please add at least one product to the cart.');
        return false;
    }

    const supplier = document.getElementById('supplier_id').value;
    if (!supplier) {
        showErrorAlert('Please select a supplier.');
        return false;
    }

    // const paidAmount = parseFloat(document.getElementById('paid_amount').value);
    // const totalAmount = calculateTotal();
    
    // if (isNaN(paidAmount) || paidAmount < 0) {
    //     showErrorAlert('Please enter a valid paid amount.');
    //     return false;
    // }

    // if (paidAmount > totalAmount) {
    //     showErrorAlert('Paid amount cannot exceed total amount.');
    //     return false;
    // }

    return true;
}

function createFormData() {
    const total = calculateTotal();
    const paidAmount = parseFloat(document.getElementById('paid_amount').value);
    const total_amount_input = parseFloat(document.getElementById('total_amount_input').value);
    
    return {
        reference: cartState.reference,
        supplier_id: document.getElementById('supplier_id').value,
        supplier_name: document.getElementById('supplier_id').selectedOptions[0].text,
        date: document.querySelector('input[name="date"]').value,
        items: cartState.items,
        tax_percentage: cartState.tax,
        tax_amount: (calculateSubtotal() * cartState.tax) / 100,
        discount_percentage: cartState.discount,
        discount_amount: (calculateSubtotal() * cartState.discount) / 100,
        shipping_amount: cartState.shipping,
        // total_amount: total,
        total_amount: total_amount_input,
        paid_amount: paidAmount,
        due_amount: total - paidAmount,
        payment_method: document.getElementById('payment_method').value,
        price_no_tax: document.getElementById('price_no_tax_input').value,
        status: 'logistics_pending', // Set initial status
        payment_status: paidAmount >= total ? 'paid' : 'partial',
        note: document.getElementById('note').value
    };
}

function handleSubmissionSuccess(result) {
    Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Pengajuan Pembelian telah di buat dan dikirim untuk verifikasi Logistik.',
        confirmButtonText: 'OK'
    }).then(() => {
        window.location.href = '/admin/manufacture/purchases';
    });
}

function showErrorAlert(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

function clearSearchResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';
}

function createNoProductsFoundAlert() {
    return `
        <div class="alert alert-warning">
            <div class="d-flex flex-column">
                <h4 class="mb-1 text-dark">Produk Tidak Ditemukan ...</h4>
                <span>Mohon Tambahkan Produk Bahan Baku di menu produk</span>
            </div>
        </div>
    `;
}