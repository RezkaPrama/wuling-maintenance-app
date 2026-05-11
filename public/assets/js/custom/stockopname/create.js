$(document).ready(function () {
    // Initialize DataTable with a variable to access it later
    let stockTable;

    // Initialize DataTable only if table is visible and has data
    function initializeDataTable() {
        // Destroy existing DataTable if it exists
        if ($.fn.DataTable.isDataTable('#stockTable')) {
            $('#stockTable').DataTable().destroy();
        }

        // Initialize a new DataTable
        stockTable = $('#stockTable').DataTable({
            responsive: true,
            language: {
                paginate: {
                    previous: '<i class="fas fa-chevron-left"></i>',
                    next: '<i class="fas fa-chevron-right"></i>'
                }
            },
            // Make sure DataTable doesn't interfere with form elements
            destroy: true
        });
    }

    // Enable/disable Get Stock button based on warehouse selection
    $('#id_warehouse').change(function () {
        if ($(this).val()) {
            $('#getStockBtn').prop('disabled', false);
        } else {
            $('#getStockBtn').prop('disabled', true);
            hideStockTable();
        }
    });

    // Get Current Stock button click handler
    $('#getStockBtn').click(function () {
        const warehouseId = $('#id_warehouse').val();
        if (!warehouseId) return;

        $.ajax({
            url: getStock,
            type: "POST",
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            data: {
                id_warehouse: warehouseId
            },
            beforeSend: function () {
                // Show loading indicator
                $('#getStockBtn').html('<i class="fas fa-spinner fa-spin"></i> Loading...');
                $('#getStockBtn').prop('disabled', true);
            },
            success: function (response) {
                if (response.success) {
                    loadStockItems(response.data);
                    // Initialize DataTable after loading items
                    initializeDataTable();
                } else {
                    alert('Failed to get stock data.');
                    hideStockTable();
                }
            },
            error: function (xhr) {
                alert('Error: ' + xhr.responseText);
                hideStockTable();
            },
            complete: function () {
                // Reset button
                $('#getStockBtn').html('<i class="fas fa-sync"></i> Tampilkan Stok saat ini');
                $('#getStockBtn').prop('disabled', false);
                $('#stockIllustration').hide();
            }
        });
    });

    // Function to load stock items into the table
    function loadStockItems(items) {
        const tableBody = $('#stockTableBody');
        tableBody.empty();

        if (items.length === 0) {
            tableBody.html('<tr><td colspan="7" class="text-center">No stock items found for this warehouse.</td></tr>');
            hideStockTable();
            return;
        }

        items.forEach((item, index) => {
            const row = `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center align-middle">${item.barcode || '-'}</td>
                    <td class="text-center align-middle">${item.product_name || '-'}</td>
                    <td class="text-center align-middle">
                        ${item.current_quantity_pack || 0}
                        <input type="hidden" name="products[${index}][id_product]" value="${item.id_product}">
                        <input type="hidden" name="products[${index}][system_quantity]" value="${item.current_quantity_pack || 0}">
                    </td>
                    <td>
                        <input type="number" step="0.01" min="0" class="form-control" 
                            name="products[${index}][physical_pack]" 
                            value="${item.current_quantity_pack || 0}" required>
                    </td>
                    <td>
                        <input type="number" step="0.01" min="0" class="form-control" 
                            name="products[${index}][physical_pcs]" 
                            value="${item.current_quantity_pcs || 0}" required>
                    </td>
                    <td>
                        <input type="text" class="form-control" 
                            name="products[${index}][notes]" 
                            placeholder="Notes">
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });

        // Show the table and submit button
        $('#stockTableContainer').show();
        $('#submitBtnContainer').show();
    }

    // Function to hide the stock table and submit button
    function hideStockTable() {
        $('#stockTableContainer').hide();
        $('#submitBtnContainer').hide();
    }

    // Form submission validation
    $('#stockOpnameForm').submit(function (e) {
        if ($('#stockTableBody tr').length === 0 || ($('#stockTableBody tr').length === 1 && $('#stockTableBody tr:first td').length === 1)) {
            e.preventDefault();
            alert('Please load stock items before saving.');
            return false;
        }

        // Check if warehouse and date are selected
        if (!$('#id_warehouse').val() || !$('#opname_date').val()) {
            e.preventDefault();
            alert('Please select warehouse and opname date.');
            return false;
        }

        // Important: Destroy DataTable before form submission to prevent interference
        if ($.fn.DataTable.isDataTable('#stockTable')) {
            $('#stockTable').DataTable().destroy();
        }

        // Renumber form indices before submission to ensure proper ordering
        renumberFormIndices();

        return true;
    });

    // Function to renumber form indices to ensure proper order
    function renumberFormIndices() {
        const rows = $('#stockTableBody tr').toArray();

        rows.forEach((row, index) => {
            $(row).find('input[name^="products"]').each(function () {
                const name = $(this).attr('name');
                const newName = name.replace(/products\[\d+\]/, `products[${index}]`);
                $(this).attr('name', newName);
            });
        });
    }

    // Product search functionality - Using keydown to prevent form submission
    $('#product-search').on('keydown', function (e) {
        const searchValue = $(this).val().trim();

        // If Enter key is pressed and the input has sufficient length
        if ((e.key === 'Enter' || e.keyCode === 13) && searchValue.length > 2) {
            e.preventDefault(); // Prevent form submission
            searchProduct(searchValue);
            return false; // Extra safety to prevent submission
        }
    });

    // Function to search for a product by barcode or name
    function searchProduct(search) {
        const warehouseId = $('#id_warehouse').val();
        if (!warehouseId) {
            alert('Please select a warehouse first.');
            return;
        }

        $.ajax({
            url: getArtikel,
            type: "POST",
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            data: {
                id_warehouse: warehouseId,
                search: search
            },
            beforeSend: function () {
                $('#product-search').addClass('spinner spinner-sm spinner-primary');
            },
            success: function (response) {
                if (response.success && response.data) {
                    addProductToTable(response.data);
                    $('#product-search').val(''); // Clear the search input
                } else {
                    alert('Product not found.');
                }
            },
            error: function (xhr) {
                alert('Error: ' + xhr.responseText);
            },
            complete: function () {
                $('#product-search').removeClass('spinner spinner-sm spinner-primary');
            }
        });
    }

    // Function to add a product to the table
    function addProductToTable(product) {
        // First, destroy DataTable if it exists
        if ($.fn.DataTable.isDataTable('#stockTable')) {
            $('#stockTable').DataTable().destroy();
        }

        // Check if product already exists in the table
        const existingRow = $(`input[name^="products"][name$="[id_product]"][value="${product.id_product}"]`).closest('tr');

        if (existingRow.length > 0) {
            // Product already exists, increment the quantity by 1
            const physicalPackInput = existingRow.find('input[name$="[physical_pack]"]');
            const currentQuantity = parseFloat(physicalPackInput.val()) || 0;
            physicalPackInput.val(currentQuantity + 1);

            // Highlight the row to show it was updated
            existingRow.addClass('bg-light-warning');
            setTimeout(() => {
                existingRow.removeClass('bg-light-warning');
            }, 2000);
        } else {
            // If product doesn't exist in table, add it with quantity 1
            const rowCount = $('#stockTableBody tr').length;

            // Create a new row
            const row = `
            <tr>
                <td class="text-center">${rowCount + 1}</td>
                <td class="text-center align-middle">${product.barcode || '-'}</td>
                <td class="text-center align-middle">${product.product_name || '-'}</td>
                <td class="text-center align-middle">
                    ${product.current_quantity_pack || 0}
                    <input type="hidden" name="products[${rowCount}][id_product]" value="${product.id_product}">
                    <input type="hidden" name="products[${rowCount}][system_quantity]" value="${product.current_quantity_pack || 0}">
                    <input type="hidden" name="products[${rowCount}][barcode]" value="${product.barcode || ''}">
                    <input type="hidden" name="products[${rowCount}][product_name]" value="${product.product_name || ''}">
                </td>
                <td>
                    <input type="number" step="0.01" min="0" class="form-control" 
                        name="products[${rowCount}][physical_pack]" 
                        value="1" required>
                </td>
                <td>
                    <input type="number" step="0.01" min="0" class="form-control" 
                        name="products[${rowCount}][physical_pcs]" 
                        value="${product.current_quantity_pcs || 0}" required>
                </td>
                <td>
                    <input type="text" class="form-control" 
                        name="products[${rowCount}][notes]" 
                        placeholder="Notes">
                </td>
            </tr>
        `;

            // Add the row to the table
            $('#stockTableBody').append(row);

            // Show the table and submit button if they were hidden
            $('#stockTableContainer').show();
            $('#submitBtnContainer').show();
        }

        // Reinitialize DataTable
        initializeDataTable();
    }
});