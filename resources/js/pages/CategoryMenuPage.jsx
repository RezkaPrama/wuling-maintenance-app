import React from 'react';
import { useNavigate } from 'react-router-dom';

// ── Kategori mesin/equipment — sesuaikan label & value etm_group ini ──
// dengan nilai ASLI di database kalau ternyata beda penulisan
// (misal setelah kamu cek hasil `options.etm_groups` dari endpoint index()/formData()).
const CATEGORIES = [
    {
        code: 'PR',
        label: 'Press',
        etmGroup: 'Press',
        icon: 'bi-hammer',
        color: 'primary',
        description: 'Mesin & equipment area Press Shop',
    },
    {
        code: 'BD',
        label: 'Body',
        etmGroup: 'Body',
        icon: 'bi-ev-front-fill',
        color: 'success',
        description: 'Mesin & equipment area Body Shop',
    },
    {
        code: 'PS',
        label: 'Paint Shop',
        etmGroup: 'Paint Shop',
        icon: 'bi-palette-fill',
        color: 'warning',
        description: 'Mesin & equipment area Paint Shop',
    },
    {
        code: 'GA',
        label: 'General Assembly',
        etmGroup: 'General Assembly',
        icon: 'bi-tools',
        color: 'info',
        description: 'Mesin & equipment area General Assembly',
    },
];

export default function CategoryMenuPage() {
    const navigate = useNavigate();

    const openCategory = (category) => {
        navigate(`/admin/equipment?filter_group=${encodeURIComponent(category.etmGroup)}`);
    };

    return (
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
                                className="category-card card card-flush w-100 h-100 text-start border-0 shadow-sm"
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="card-body d-flex flex-column align-items-center text-center py-10">
                                    <div
                                        className={`symbol symbol-75px symbol-circle bg-light-${cat.color} mb-5 d-flex align-items-center justify-content-center`}
                                        style={{ width: 90, height: 90 }}
                                    >
                                        <i className={`bi ${cat.icon} fs-1 text-${cat.color}`} />
                                    </div>
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
    );
}