import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageToolbar from '../../components/PageToolbar';

// ── Kategori mesin/equipment — sesuaikan label & value etm_group ini ──
// dengan nilai ASLI di database (harus EXACT MATCH, karena filter di
// backend pakai `where('etm_group', $value)`, bukan LIKE/contains).
// Cara cek nilai asli: buka Network tab -> panggil GET /v1/equipment/form-data
// -> lihat isi array `etm_groups`, copy persis dari situ.
//
// FIX: `icon` diganti/dilengkapi `image` — path ke file JPG/PNG di folder
// public Laravel (BUKAN lewat import Vite, karena ini file statis biasa,
// bukan asset yang di-bundle). Taruh file gambarnya di:
//   public/assets/media/categories/nama-file.jpg
// lalu tulis path-nya di sini dengan awalan '/assets/media/categories/...'
// (sama persis kayak convention asset() yang dipakai Blade Metronic kamu).
const CATEGORIES = [
    {
        code: 'PR',
        label: 'Press',
        etmGroup: 'Press', // TODO: cek persis ejaan di DB
        image: '/assets/media/categories/cnc_system.jpg', // TODO: taruh gambar Press di public/assets/media/categories/, lalu isi path-nya di sini
        icon: 'bi-hammer', // fallback kalau `image` belum diisi / gagal dimuat
        color: 'primary',
        description: 'Mesin & equipment area Press Shop',
    },
    {
        code: 'BD',
        label: 'Body Shop',
        etmGroup: 'Body Shop', // FIX: sebelumnya 'Body', tapi data di DB "Body Shop"
        image: '/assets/media/categories/assembly_line.jpg', // TODO: taruh gambar Body di public/assets/media/categories/, lalu isi path-nya di sini
        icon: 'bi-car-front',
        color: 'success',
        description: 'Mesin & equipment area Body Shop',
    },
    {
        code: 'PS',
        label: 'Paint Shop',
        etmGroup: 'Paint Shop', // TODO: cek persis ejaan di DB
        image: '/assets/media/categories/robotics.jpg', // TODO: taruh gambar Paint Shop di public/assets/media/categories/, lalu isi path-nya di sini
        icon: 'bi-palette-fill',
        color: 'warning',
        description: 'Mesin & equipment area Paint Shop',
    },
    {
        code: 'GA',
        label: 'General Assembly',
        etmGroup: 'General Assembly', // TODO: cek persis ejaan di DB
        image: '/assets/media/categories/automatic_loaders.jpg', // dari file yang kamu upload
        icon: 'bi-tools', // fallback kalau file image di atas gagal dimuat
        color: 'info',
        description: 'Mesin & equipment area General Assembly',
    },
];

export default function CategoryDashboardPage() {
    const navigate = useNavigate();

    // ── Sembunyikan sidebar Metronic HANYA saat halaman ini aktif ──────
    useEffect(() => {
        document.body.classList.add('kt-hide-aside');
        return () => {
            document.body.classList.remove('kt-hide-aside');
        };
    }, []);

    const openCategory = (category) => {
        navigate(`/admin/equipment?filter_group=${encodeURIComponent(category.etmGroup)}`);
    };

    // Kalau file image gagal dimuat (path salah / belum ada file-nya),
    // sembunyikan <img> dan biarkan fallback icon di bawahnya yang tampil.
    const handleImageError = (e) => {
        e.target.style.display = 'none';
        e.target.nextElementSibling.style.display = 'flex';
    };

    return (
        <>
            <PageToolbar title="Dashboard" menuUtama="Menu Utama" menuItem="Dashboard" />

            <div className="d-flex flex-column flex-column-fluid">
                <div className="container-xxl py-10">

                    <div className="text-center mb-10">
                        <h1 className="fw-bolder text-gray-900 mb-2">Pilih Area Equipment</h1>
                        <div className="text-muted fs-5">Pilih kategori untuk melihat daftar mesin & jadwal maintenance</div>
                    </div>

                    <div className="row g-6 g-xl-9 justify-content-center">
                        {CATEGORIES.map((cat) => (
                            <div className="col-md-6 col-xl-3" key={cat.code}>
                                <button
                                    type="button"
                                    onClick={() => openCategory(cat)}
                                    className="category-card card card-flush w-100 h-100 text-start border-0 shadow-lg overflow-hidden p-0"
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* ── Gambar kategori (kalau ada) ── */}
                                    {cat.image && (
                                        <img
                                            src={cat.image}
                                            alt={cat.label}
                                            onError={handleImageError}
                                            style={{ width: '100%', height: 150, objectFit: 'cover' }}
                                        />
                                    )}

                                    {/* ── Fallback icon — tampil kalau `image` null ATAU gagal dimuat ── */}
                                    {/* <div
                                        className={`d-flex align-items-center justify-content-center bg-light-${cat.color}`}
                                        style={{ width: '100%', height: 150, display: cat.image ? 'none' : 'flex' }}
                                    >
                                        <i className={`bi ${cat.icon} fs-1 text-${cat.color}`} style={{ fontSize: '3rem' }} />
                                    </div> */}

                                    <div className="card-body d-flex flex-column align-items-center text-center py-6">
                                        <div className="fw-bolder fs-3 text-gray-900 mb-1">{cat.label}</div>
                                        <div className="text-muted fs-7">{cat.description}</div>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>

                </div>

                {/* ── Efek hover kartu, mirip app launcher Odoo ── */}
                <style>{`
                    .category-card {
                        transition: transform 0.15s ease, box-shadow 0.15s ease;
                        border-radius: 1rem;
                    }
                    .category-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.1) !important;
                    }
                `}</style>
            </div>
        </>
    );
}