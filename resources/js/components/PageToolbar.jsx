import React from 'react';
import ReactDOM from 'react-dom';

// ============================================================
// PageToolbar — menggantikan @yield('title')/@yield('menuItem') dkk
// yang dulu dipakai layouts/partials/toolbar.blade.php.
//
// Karena navigasi sekarang di sisi client (React Router), Blade tidak
// tahu halaman mana yang aktif. Jadi komponen ini di-render lewat
// ReactDOM.createPortal ke <div id="page-toolbar-slot"> yang sudah
// disiapkan statis di app.blade.php — tapi ISINYA tetap dikontrol
// oleh halaman React yang sedang aktif, jadi otomatis berubah tiap
// pindah halaman tanpa reload.
//
// CARA PAKAI (taruh di baris paling atas tiap page component):
//   <PageToolbar
//     title="Daftar Equipment"
//     menuUtama="Menu Utama"
//     menuItem="Equipment"
//   />
// ============================================================
export default function PageToolbar({ title, menuUtama, menuItem }) {
    const slot = document.getElementById('page-toolbar-slot');

    // Slot belum ada (misal komponen ini dirender di luar halaman /admin/*)
    // -> jangan render apa-apa, daripada error nyari elemen yang nggak ada.
    if (!slot) return null;

    return ReactDOM.createPortal(
        <>
            {/* Title */}
            <h1 className="d-flex text-dark fw-bolder fs-3 align-items-center my-1">
                {title}
            </h1>

            {/* Separator */}
            <span className="h-20px border-gray-300 border-start mx-4"></span>

            {/* Breadcrumb */}
            <ul className="breadcrumb breadcrumb-separatorless fw-bold fs-7 my-1">
                <li className="breadcrumb-item text-muted">
                    <span className="text-muted">{menuUtama}</span>
                </li>
                <li className="breadcrumb-item">
                    <span className="bullet bg-gray-300 w-5px h-2px"></span>
                </li>
                <li className="breadcrumb-item text-muted">{menuItem}</li>
                <li className="breadcrumb-item">
                    <span className="bullet bg-gray-300 w-5px h-2px"></span>
                </li>
                <li className="breadcrumb-item text-dark">{title}</li>
            </ul>
        </>,
        slot
    );
}