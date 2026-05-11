$(document).ready(function() {
    let currentReturData = null;

    // Initialize Select2 for No Retur
    $('#no_retur').select2({
        ajax: {
            url: getReturListUrl,
            dataType: 'json',
            delay: 250,
            data: function(params) {
                return {
                    q: params.term,
                    page: params.page || 1
                };
            },
            processResults: function(data) {
                return {
                    results: data.results,
                    pagination: data.pagination
                };
            },
            cache: true
        },
        placeholder: 'Ketik untuk mencari nomor retur...',
        minimumInputLength: 0,
        allowClear: true
    });

    // Enable/Disable Load Detail button
    $('#no_retur').on('change', function() {
        const hasValue = $(this).val() !== '';
        $('#btn-load-detail').prop('disabled', !hasValue);
        
        if (!hasValue) {
            resetForm();
        }
    });

    // Load Detail Button Click
    $('#btn-load-detail').on('click', function() {
        const noRetur = $('#no_retur').val();
        
        if (!noRetur) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Pilih nomor retur terlebih dahulu!'
            });
            return;
        }

        loadReturDetail(noRetur);
    });

    // Load Retur Detail
    function loadReturDetail(noRetur) {
        // Show loading
        Swal.fire({
            title: 'Memuat Data...',
            text: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const url = getReturDetailUrl.replace(':no_retur', encodeURIComponent(noRetur));

        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                if (response.success) {
                    currentReturData = response.data;
                    displayHeaderInfo(response.data.header);
                    displayDetailTable(response.data.details);
                    
                    $('#header-section').slideDown();
                    $('#detail-section').slideDown();
                    
                    Swal.close();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: response.message || 'Gagal memuat data'
                    });
                }
            },
            error: function(xhr) {
                let errorMessage = 'Terjadi kesalahan saat memuat data';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        });
    }

    // Display Header Information
    function displayHeaderInfo(header) {
        $('#info_no_retur').text(header.no_retur || '-');
        $('#info_tgl_terima').text(formatDate(header.tgl_terima) || '-');
        $('#info_periode').text(header.periode || '-');
        $('#info_no_faktur').text(header.no_faktur || '-');
        $('#info_j_transaksi').text(header.j_transaksi || '-');
        $('#info_sales').text(header.nama_employee || '-');
        $('#info_id_cust').text(header.id_cust || '-');
        $('#info_nama_customer').text(header.nama_customer || '-');
        $('#info_telepon').text(header.telepon_customer || '-');
        $('#info_alamat').text(header.alamat_customer || '-');
        $('#info_kelurahan').text(header.kelurahan || '-');
        $('#info_kecamatan').text(header.kecamatan || '-');
        $('#info_provinsi').text(header.provinsi || '-');
        $('#info_alasan').text(header.alasan || '-');
    }

    // Display Detail Table
    function displayDetailTable(details) {
        const tbody = $('#detail-tbody');
        tbody.empty();

        if (!details || details.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="9" class="text-center">Tidak ada data detail</td>
                </tr>
            `);
            return;
        }

        details.forEach((item, index) => {
            const row = `
                <tr data-kode-bar="${item.kode_bar}">
                    <td class="text-center">${index + 1}</td>
                    <td>${item.kode_bar || '-'}</td>
                    <td>${item.nama_product || '-'}</td>
                    <td class="text-center">${item.art || '-'}</td>
                    <td class="text-center">${item.color || '-'}</td>
                    <td class="text-center">${item.size || '-'}</td>
                    <td class="text-center pasang-sistem">${formatNumber(item.pasang)}</td>
                    <td class="text-center">
                        <input type="number" 
                               class="form-control form-control-sm input-fisik text-center" 
                               data-kode-bar="${item.kode_bar}"
                               data-pasang-sistem="${item.pasang}"
                               value="${item.pasang}"
                               min="0"
                               required>
                    </td>
                    <td class="text-center selisih-cell">
                        <span class="badge badge-selisih selisih-zero">0</span>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        calculateTotals();
    }

    // Calculate Selisih on Input Change
    $(document).on('input', '.input-fisik', function() {
        const pasangSistem = parseInt($(this).data('pasang-sistem')) || 0;
        const pasangFisik = parseInt($(this).val()) || 0;
        const selisih = pasangFisik - pasangSistem;
        
        const selisihCell = $(this).closest('tr').find('.selisih-cell span');
        selisihCell.text(selisih);
        
        // Update badge class based on selisih
        selisihCell.removeClass('selisih-positive selisih-negative selisih-zero badge-success badge-danger badge-secondary');
        
        if (selisih > 0) {
            selisihCell.addClass('selisih-positive badge-success');
        } else if (selisih < 0) {
            selisihCell.addClass('selisih-negative badge-danger');
        } else {
            selisihCell.addClass('selisih-zero badge-secondary');
        }

        calculateTotals();
    });

    // Calculate Totals
    function calculateTotals() {
        let totalSistem = 0;
        let totalFisik = 0;

        $('.input-fisik').each(function() {
            const pasangSistem = parseInt($(this).data('pasang-sistem')) || 0;
            const pasangFisik = parseInt($(this).val()) || 0;
            
            totalSistem += pasangSistem;
            totalFisik += pasangFisik;
        });

        const totalSelisih = totalFisik - totalSistem;

        $('#total-sistem').text(formatNumber(totalSistem));
        $('#total-fisik').text(formatNumber(totalFisik));
        
        const selisihText = totalSelisih > 0 ? '+' + formatNumber(totalSelisih) : formatNumber(totalSelisih);
        $('#total-selisih').text(selisihText);

        // Apply color to total selisih
        const totalSelisihCell = $('#total-selisih');
        totalSelisihCell.removeClass('selisih-positive selisih-negative selisih-zero');
        
        if (totalSelisih > 0) {
            totalSelisihCell.addClass('selisih-positive');
        } else if (totalSelisih < 0) {
            totalSelisihCell.addClass('selisih-negative');
        } else {
            totalSelisihCell.addClass('selisih-zero');
        }
    }

    // Submit Form
    $('#verifikasi-retur-form').on('submit', function(e) {
        e.preventDefault();

        const noRetur = $('#no_retur').val();
        
        if (!noRetur) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Pilih nomor retur terlebih dahulu!'
            });
            return;
        }

        // Collect verification details
        const verifikasiDetails = [];
        let hasEmptyInput = false;

        $('.input-fisik').each(function() {
            const kodebar = $(this).data('kode-bar');
            const pasangSistem = parseInt($(this).data('pasang-sistem')) || 0;
            const pasangFisik = parseInt($(this).val());
            
            if (isNaN(pasangFisik) || $(this).val() === '') {
                hasEmptyInput = true;
                return false;
            }

            verifikasiDetails.push({
                kode_bar: kodebar,
                pasang_sistem: pasangSistem,
                pasang_fisik: pasangFisik,
                keterangan: $('#catatan_verifikasi').val()
            });
        });

        if (hasEmptyInput) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Mohon lengkapi semua input pasang fisik!'
            });
            return;
        }

        // Confirm before submit
        Swal.fire({
            title: 'Konfirmasi Verifikasi',
            html: `
                <p>Apakah Anda yakin data verifikasi sudah benar?</p>
                <div class="mt-3 text-start">
                    <strong>Total Sistem:</strong> ${$('#total-sistem').text()}<br>
                    <strong>Total Fisik:</strong> ${$('#total-fisik').text()}<br>
                    <strong>Total Selisih:</strong> ${$('#total-selisih').text()}
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                submitVerification(noRetur, verifikasiDetails);
            }
        });
    });

    // Submit Verification to Server
    function submitVerification(noRetur, verifikasiDetails) {
        Swal.fire({
            title: 'Menyimpan...',
            text: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: storeVerifikasiUrl,
            type: 'POST',
            data: {
                _token: $('input[name="_token"]').val(),
                no_retur: noRetur,
                verifikasi_details: verifikasiDetails
            },
            success: function(response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: response.message || 'Verifikasi berhasil disimpan',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        resetForm();
                        $('#no_retur').val(null).trigger('change');
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: response.message || 'Gagal menyimpan verifikasi'
                    });
                }
            },
            error: function(xhr) {
                let errorMessage = 'Terjadi kesalahan saat menyimpan data';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        });
    }

    // Reset Button
    $('#btn-reset').on('click', function() {
        Swal.fire({
            title: 'Reset Form?',
            text: 'Semua perubahan akan dikembalikan ke nilai awal',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Reset',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                if (currentReturData) {
                    displayDetailTable(currentReturData.details);
                }
                $('#catatan_verifikasi').val('');
            }
        });
    });

    // Reset Form Function
    function resetForm() {
        currentReturData = null;
        $('#header-section').slideUp();
        $('#detail-section').slideUp();
        $('#detail-tbody').empty();
        $('#catatan_verifikasi').val('');
        
        // Reset info fields
        $('#info_no_retur, #info_tgl_terima, #info_periode, #info_no_faktur, #info_j_transaksi, #info_sales, #info_id_cust, #info_nama_customer, #info_telepon, #info_alamat, #info_kelurahan, #info_kecamatan, #info_provinsi, #info_alasan').text('-');
        
        // Reset totals
        $('#total-sistem, #total-fisik, #total-selisih').text('0');
    }

    // Utility Functions
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatNumber(num) {
        if (isNaN(num)) return '0';
        return parseInt(num).toLocaleString('id-ID');
    }
});