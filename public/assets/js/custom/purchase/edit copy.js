// Purchase Edit Script
document.addEventListener('DOMContentLoaded', function () {
    initializeComponents();
    loadExistingPurchaseData();
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

// Initialize components
function initializeComponents() {
    initializeSelect2();
    initializeFormValidation();
}

// Initialize select2 for dropdowns
function initializeSelect2() {
    // Initialize supplier select2
    const supplierSelect = $('#supplier_id');
    const productSearch = document.getElementById('product-search');

    supplierSelect.select2({
        placeholder: 'Pilih Supplier',
        allowClear: true
    });

    // Initial state based on whether a supplier is already selected
    const initialSupplierId = supplierSelect.val();
    if (initialSupplierId) {
        productSearch.disabled = false;
        productSearch.placeholder = 'Klik untuk melihat produk...';
    } else {
        productSearch.disabled = true;
        productSearch.placeholder = 'Pilih supplier terlebih dahulu...';
    }

    // Handle supplier change
    supplierSelect.on('change', function() {
        const supplierId = $(this).val();
        const selectedOption = $(this).find('option:selected');
        const topValue = selectedOption.data('top');
        
        // Set TOP value if available
        if (topValue) {
            $('#top').val(topValue);
        } else {
            $('#top').val(''); // Clear TOP if no value
        }
        
        if (supplierId) {
            // Enable product search
            productSearch.disabled = false;
            productSearch.placeholder = 'Klik untuk melihat produk...';
            
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
            
            // Clear TOP when no supplier selected
            $('#top').val('');

            // Clear cart if supplier is deselected
            cartState.items = [];
            updateCartTable();
            updateTotalCalculations();
        }
    });

    // Trigger initial change event to set up correct state
    supplierSelect.trigger('change');
}

// Load existing purchase data
function loadExistingPurchaseData() {
    // Get purchase ID from the last segment of URL (after /edit)
    const pathSegments = window.location.pathname.split('/');
    const purchaseId = pathSegments[pathSegments.length - 2]; // Get ID before /edit
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    // Fetch purchase data with correct API path
    fetch(`/api/v1/purchases/${purchaseId}/details`, {
        headers: {
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.purchase && data.purchase_details) {
            const purchase = data.purchase;
            const details = data.purchase_details;
            
            // Set cart state
            cartState.reference = purchase.reference;
            cartState.tax = purchase.tax_percentage;
            cartState.discount = purchase.discount_percentage;
            cartState.shipping = purchase.shipping_amount;
            
            // Load items into cart
            cartState.items = details.map(detail => ({
                product_id: detail.product_id,
                product_name: detail.product_name,
                product_code: detail.product_code,
                price: detail.price,
                unit_price: detail.unit_price,
                quantity: detail.quantity,
                sub_total: detail.quantity * detail.price,
                product_discount_amount: detail.product_discount_amount || 0,
                product_discount_type: detail.product_discount_type || 'fixed',
                product_tax_amount: detail.product_tax_amount || 0,
                stock: detail.stock || 0,
                unit: detail.unit || 'pcs'
            }));
            
            // Update UI
            document.getElementById('tax_percentage').value = purchase.tax_percentage;
            document.getElementById('discount_percentage').value = purchase.discount_percentage;
            document.getElementById('shipping_amount').value = purchase.shipping_amount;
            
            // Update cart table and calculations
            updateCartTable();
            updateTotalCalculations();
        }
    })
    .catch(error => {
        console.error('Error loading purchase data:', error);
        showErrorAlert('Error loading purchase data: ' + error.message);
    });
}

// Function to show error alert
function showErrorAlert(message) {
    Swal.fire({
        icon: 'info',
        title: 'Info',
        text: message,
        confirmButtonText: 'OK'
    });
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

    if (!products || products.length === 0) {
        searchResults.innerHTML = createNoProductsFoundAlert();
        return;
    }

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'card shadow';
    resultsContainer.innerHTML = `
        <ul class="list-group list-group-flush">
            ${products.map(product => `
                <li class="list-group-item list-group-item-action" data-product-id="${product.id}">
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
                </li>
            `).join('')}
        </ul>
    `;

    searchResults.appendChild(resultsContainer);
    attachProductClickHandlers(products);
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
// Update cart table
function updateCartTable() {
    const cartBody = document.getElementById('cart-body');
    
    // Clear existing content
    cartBody.innerHTML = '';
    
    if (cartState.items.length === 0) {
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

    // Add items to cart
    cartBody.innerHTML = cartState.items.map(item => `
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
    `).join('');
    
    // Reattach event listeners
    attachCartEventListeners();
}

// Format money
function formatMoney(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
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
    return subtotal - discountAmount + cartState.shipping;
    // return subtotal + taxAmount - discountAmount + cartState.shipping;
}

function updateTotalCalculations() {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * cartState.tax) / 100;
    const priceWithoutTax = subtotal - taxAmount;
    const discountAmount = (subtotal * cartState.discount) / 100;
    const total = calculateTotal();

    // Update display
    document.getElementById('tax-amount').textContent = `(+) ${formatMoney(taxAmount)}`;
    document.getElementById('price-without-tax').textContent = `${formatMoney(priceWithoutTax)}`;
    document.getElementById('discount-amount').textContent = `(-) ${formatMoney(discountAmount)}`;
    document.getElementById('shipping-amount').textContent = `(+) ${formatMoney(cartState.shipping)}`;
    document.getElementById('total-amount').textContent = formatMoney(total);
    document.getElementById('total_amount_input').value = total;
    document.getElementById('paid_amount').value = 0; // Always set to 0
    document.getElementById('price_no_tax_input').value = priceWithoutTax;
}

function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    // Get the purchase ID from URL
    const pathSegments = window.location.pathname.split('/');
    const purchaseId = pathSegments[pathSegments.length - 2];

    // Create form data
    const formData = new FormData();
    
    // Append basic form fields
    formData.append('_token', document.querySelector('input[name="_token"]').value);
    formData.append('_method', 'PUT');
    formData.append('date', document.querySelector('input[name="date"]').value);
    formData.append('reference', document.querySelector('input[name="reference"]').value);
    formData.append('supplier_id', document.querySelector('#supplier_id').value);
    formData.append('top', document.querySelector('#top').value);
    formData.append('price_no_tax', document.querySelector('#price_no_tax_input').value);
    formData.append('status', 'logistics_pending');
    formData.append('payment_method', document.querySelector('#payment_method').value);
    formData.append('note', document.querySelector('#note').value);

    // Calculate totals
    const subtotal = calculateSubtotal();
    const tax_percentage = parseFloat(document.querySelector('#tax_percentage').value || 0);
    const discount_percentage = parseFloat(document.querySelector('#discount_percentage').value || 0);
    const shipping_amount = parseFloat(document.querySelector('#shipping_amount').value || 0);
    const total_amount = calculateTotal();
    const paid_amount = parseFloat(document.querySelector('#paid_amount').value || 0);

    // Append calculated values
    formData.append('tax_percentage', tax_percentage);
    formData.append('tax_amount', (subtotal * tax_percentage / 100));
    formData.append('discount_percentage', discount_percentage);
    formData.append('discount_amount', (subtotal * discount_percentage / 100));
    formData.append('shipping_amount', shipping_amount);
    formData.append('total_amount', total_amount);
    formData.append('paid_amount', paid_amount);
    formData.append('due_amount', total_amount - paid_amount);

    // Append products data - THIS IS THE KEY FIX
    cartState.items.forEach((item, index) => {
        formData.append(`products[${index}][product_id]`, item.product_id);
        formData.append(`products[${index}][product_name]`, item.product_name);
        formData.append(`products[${index}][product_code]`, item.product_code);
        formData.append(`products[${index}][quantity]`, item.quantity);
        formData.append(`products[${index}][price]`, item.price);
        formData.append(`products[${index}][unit_price]`, item.price);
        formData.append(`products[${index}][sub_total]`, item.sub_total);
        formData.append(`products[${index}][product_discount_amount]`, 0);
        formData.append(`products[${index}][product_discount_type]`, 'fixed');
        formData.append(`products[${index}][product_tax_amount]`, 0);
    });

    // Log the data for debugging
    const formDataObj = {};
    for(let pair of formData.entries()) {
        formDataObj[pair[0]] = pair[1];
    }
    console.log('Form data being sent:', formDataObj);

    // Send request
    fetch(`/admin/manufacture/purchases/${purchaseId}`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(async response => {
        const responseData = await response.text();
        console.log('Raw server response:', responseData);

        try {
            const jsonData = JSON.parse(responseData);
            if (!response.ok) {
                throw new Error(jsonData.message || 'Update failed');
            }
            return jsonData;
        } catch (e) {
            console.error('Error parsing response:', e);
            throw new Error('Server response error: ' + responseData.substring(0, 100));
        }
    })
    .then(result => {
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message || 'Pengajuan Pembelian Berhasil di edit',
                confirmButtonText: 'OK'
            }).then(() => {
                window.location.href = '/admin/manufacture/purchases';
            });
        } else {
            throw new Error(result.message || 'Failed to update purchase');
        }
    })
    .catch(error => {
        console.error('Detailed error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            html: `
                <div class="text-left">
                    <p>Error updating purchase:</p>
                    <p class="text-danger">${error.message}</p>
                    <p>Please check the browser console for more details.</p>
                </div>
            `,
            confirmButtonText: 'OK'
        });
    });
}

// Validation function
function validateForm() {
    // Validate products
    if (cartState.items.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please add at least one product to the cart'
        });
        return false;
    }

    // Validate supplier
    const supplier = document.getElementById('supplier_id').value;
    if (!supplier) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please select a supplier'
        });
        return false;
    }

    // Validate date
    const date = document.querySelector('input[name="date"]').value;
    if (!date) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please select a date'
        });
        return false;
    }

    // All validations passed
    return true;
}

function handleSubmissionSuccess(result) {
    Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Pembelian Berhasil Diupdate.',
        confirmButtonText: 'OK'
    }).then(() => {
        window.location.href = '/purchases';
    });
}

function clearSearchResults() {
    document.getElementById('search-results').innerHTML = '';
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