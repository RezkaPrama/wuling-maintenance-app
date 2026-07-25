import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchTemplateDetail,
    toggleTemplateActive,
    deleteTemplate,
    clearDetail,
} from '../../features/checksheet/checkSheetSlice';
import PageToolbar from '../../components/PageToolbar';

export default function CheckSheetDetailPage() {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { data, status } = useSelector((s) => s.checksheet.detail);

    useEffect(() => {
        dispatch(fetchTemplateDetail(id));
        return () => dispatch(clearDetail());
    }, [id]);

    if (status === 'loading' || !data) {
        return (
            <>
                <PageToolbar title="Check Sheet" menuUtama="Menu Utama" menuItem="Check Sheet" />
                <div className="text-center py-15 text-muted">Memuat detail template...</div>
            </>
        );
    }

    const { template, items, pm_types: pmTypes, stats } = data;
    const activeItems = items.filter((it) => it.is_active);

    // ── PM Types yang dipakai — hitung + urutkan desc, sama seperti Blade ──
    const pmTypeCounts = {};
    activeItems.forEach((it) => {
        it.pm_types.forEach((code) => {
            pmTypeCounts[code] = (pmTypeCounts[code] || 0) + 1;
        });
    });
    const usedTypes = Object.entries(pmTypeCounts).sort((a, b) => b[1] - a[1]);
    const getPmTypeColor = (code) => pmTypes.find((pt) => pt.code === code)?.color_code || '#6c757d';

    // ── Grouping preview table berdasarkan perubahan sub_equipment berurutan ──
    const rows = [];
    let lastSubEq = '__INIT__';
    activeItems.forEach((it) => {
        if (it.sub_equipment !== lastSubEq) {
            rows.push({ type: 'group', label: it.sub_equipment || 'General' });
            lastSubEq = it.sub_equipment;
        }
        rows.push({ type: 'item', data: it });
    });

    const totalTimeHours = Math.floor(stats.total_time / 60);
    const totalTimeMinutes = stats.total_time % 60;

    const handleToggle = () => dispatch(toggleTemplateActive(template.id));

    const handleDelete = async () => {
        const confirmed = window.Swal
            ? await window.Swal.fire({
                  title: 'Hapus template ini secara permanen?',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Ya, Hapus',
                  cancelButtonText: 'Batal',
                  buttonsStyling: false,
                  customClass: { confirmButton: 'btn btn-danger me-3', cancelButton: 'btn btn-light' },
              }).then((r) => r.isConfirmed)
            : window.confirm('Hapus template ini secara permanen?');

        if (!confirmed) return;

        const result = await dispatch(deleteTemplate(template.id));
        if (deleteTemplate.fulfilled.match(result)) {
            navigate('/admin/check-sheet/templates');
        } else {
            alert(result.payload);
        }
    };

    return (
        <>
            <PageToolbar title={template.template_name} menuUtama="Menu Utama" menuItem="Check Sheet" />

            {/* Header */}
            <div className="d-flex align-items-start justify-content-between mb-6 flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                    <Link to="/admin/check-sheet/templates" className="btn btn-sm btn-light">
                        <i className="bi bi-arrow-left"></i>
                    </Link>
                    <div>
                        <div className="text-muted fs-8 mb-1">
                            <Link to="/admin/check-sheet/templates" className="text-muted text-hover-primary">
                                Check Sheet Templates
                            </Link>
                            <i className="bi bi-chevron-right mx-1" style={{ fontSize: '.6rem' }}></i>
                            Detail
                        </div>
                        <h1 className="fs-2 fw-bold text-gray-900 mb-0">{template.template_name}</h1>
                        <div className="text-muted fs-6">
                            #{template.doc_number} ·
                            <span className="badge badge-light-primary ms-1">{template.pm_cycle}</span>
                            {!template.is_active && <span className="badge badge-light-secondary ms-1">Nonaktif</span>}
                            {template.default_for_etm_group && (
                                <span className="badge badge-light-success ms-1">
                                    <i className="bi bi-star-fill me-1"></i>Default: {template.default_for_etm_group}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <Link to={`/admin/check-sheet/templates/${template.id}/edit`} className="btn btn-warning">
                        <i className="bi bi-pencil me-1"></i>Edit Template
                    </Link>
                    <button
                        type="button"
                        className={`btn ${template.is_active ? 'btn-light-secondary' : 'btn-light-success'}`}
                        onClick={handleToggle}
                    >
                        <i className={`bi bi-toggle-${template.is_active ? 'off' : 'on'} me-1`}></i>
                        {template.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                </div>
            </div>

            <div className="row g-5">

                {/* ── Kiri: Info + Stats ── */}
                <div className="col-lg-4">

                    <div className="card card-flush border-0 shadow-sm mb-5">
                        <div className="card-header border-0 pt-5">
                            <h3 className="card-title fw-bold fs-6">
                                <i className="bi bi-info-circle me-2 text-primary"></i>Informasi Template
                            </h3>
                        </div>
                        <div className="card-body pt-2">
                            <div className="row g-3">
                                <InfoItem label="Equipment" value={
                                    <Link to={`/admin/equipment/${template.equipment_id}`} className="text-primary">
                                        {template.equipment_name}
                                    </Link>
                                } />
                                <InfoItem label="Kode" value={template.equipment_code} />
                                <InfoItem label="ETM Group" value={template.etm_group || '—'} />
                                <InfoItem label="Lokasi" value={template.location || '—'} />
                                <InfoItem label="Doc Number" value={template.doc_number} />
                                <InfoItem label="PM Cycle" value={<span className="badge badge-light-primary">{template.pm_cycle}</span>} />
                                <InfoItem label="Status" value={
                                    template.is_active
                                        ? <span className="badge badge-light-success">Aktif</span>
                                        : <span className="badge badge-light-secondary">Nonaktif</span>
                                } />
                                <InfoItem label="Dipakai di" value={`${stats.usage_count} record PM`} />
                            </div>
                        </div>
                    </div>

                    <div className="card card-flush border-0 shadow-sm mb-5">
                        <div className="card-header border-0 pt-5">
                            <h3 className="card-title fw-bold fs-6">
                                <i className="bi bi-bar-chart me-2 text-primary"></i>Ringkasan
                            </h3>
                        </div>
                        <div className="card-body pt-2">
                            <div className="row g-3 text-center">
                                <div className="col-4">
                                    <div className="fs-2 fw-bold text-primary">{activeItems.length}</div>
                                    <div className="text-muted fs-8">Total Item</div>
                                </div>
                                <div className="col-4">
                                    <div className="fs-2 fw-bold text-success">{stats.total_man_power}</div>
                                    <div className="text-muted fs-8">Man Power</div>
                                </div>
                                <div className="col-4">
                                    <div className="fs-2 fw-bold text-info">{stats.total_time}</div>
                                    <div className="text-muted fs-8">Mnt (plan)</div>
                                </div>
                            </div>
                            <div className="border-top mt-3 pt-3">
                                <div className="d-flex justify-content-between fs-8 text-muted mb-1">
                                    <span>Sub Equipment / Grup</span>
                                    <span className="fw-bold text-gray-800">{stats.sub_equip_groups}</span>
                                </div>
                                <div className="d-flex justify-content-between fs-8 text-muted">
                                    <span>Estimasi total waktu</span>
                                    <span className="fw-bold text-gray-800">
                                        {totalTimeHours > 0 ? `${totalTimeHours}j ` : ''}{totalTimeMinutes}mnt
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card card-flush border-0 shadow-sm">
                        <div className="card-header border-0 pt-5">
                            <h3 className="card-title fw-bold fs-6">
                                <i className="bi bi-tags me-2 text-primary"></i>PM Types Digunakan
                            </h3>
                        </div>
                        <div className="card-body pt-2">
                            {usedTypes.map(([code, count]) => {
                                const color = getPmTypeColor(code);
                                const pct = activeItems.length ? Math.min(100, (count / activeItems.length) * 100) : 0;
                                return (
                                    <div className="d-flex align-items-center justify-content-between mb-2" key={code}>
                                        <span
                                            className="badge fs-9 fw-bold"
                                            style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}
                                        >
                                            {code}
                                        </span>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="progress" style={{ width: 80, height: 6 }}>
                                                <div className="progress-bar" style={{ width: `${pct}%`, background: color }}></div>
                                            </div>
                                            <span className="text-muted fs-8">{count} item</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Kanan: Preview Tabel ── */}
                <div className="col-lg-8">
                    <div className="card card-flush border-0 shadow-sm">
                        <div className="card-header border-0 pt-5">
                            <h3 className="card-title fw-bold fs-5">
                                <i className="bi bi-table me-2 text-primary"></i>Preview Check Sheet Items
                            </h3>
                            <div className="card-toolbar">
                                <Link to={`/admin/check-sheet/templates/${template.id}/edit`} className="btn btn-sm btn-light-warning">
                                    <i className="bi bi-pencil me-1"></i>Edit Items
                                </Link>
                            </div>
                        </div>
                        <div className="card-body pt-0 px-4 pb-4">
                            <div className="table-responsive">
                                <table className="table align-middle" style={{ minWidth: 800, fontSize: '.8rem' }}>
                                    <thead>
                                        <tr className="fs-8 text-uppercase fw-bold text-center" style={{ background: '#1e3a5f', color: '#fff' }}>
                                            <th style={{ width: 32 }}>#</th>
                                            <th className="text-start" style={{ minWidth: 100 }}>Sub Equip.</th>
                                            <th className="text-start" style={{ minWidth: 160 }}>Check Item</th>
                                            <th className="text-start" style={{ minWidth: 160 }}>Maintenance Standard</th>
                                            <th style={{ minWidth: 180 }}>PM Type</th>
                                            <th style={{ width: 60 }}>MP</th>
                                            <th style={{ width: 60 }}>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, i) =>
                                            row.type === 'group' ? (
                                                <tr key={`g-${i}`} style={{ background: '#eef2ff' }}>
                                                    <td colSpan={7} className="fw-bold" style={{ color: '#3f51b5', padding: '5px 12px', fontSize: '.75rem' }}>
                                                        <i className="bi bi-gear-fill me-2 opacity-75" style={{ fontSize: '.68rem' }}></i>
                                                        {row.label}
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={row.data.id}>
                                                    <td className="text-center fw-bold text-muted">{row.data.item_number}</td>
                                                    <td className="text-muted" style={{ fontSize: '.72rem' }}>{row.data.sub_equipment}</td>
                                                    <td className="fw-semibold">{row.data.check_item}</td>
                                                    <td className="text-muted" style={{ fontSize: '.72rem', lineHeight: 1.3 }}>{row.data.maintenance_standard}</td>
                                                    <td>
                                                        <div className="d-flex flex-wrap gap-1 justify-content-center">
                                                            {row.data.pm_types.map((pt) => {
                                                                const color = getPmTypeColor(pt);
                                                                return (
                                                                    <span
                                                                        key={pt}
                                                                        className="badge fs-9"
                                                                        style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}
                                                                    >
                                                                        {pt}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="text-center fw-semibold">{row.data.man_power}</td>
                                                    <td className="text-center fw-semibold">{row.data.time_minutes}</td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#f5f8fa' }}>
                                            <td colSpan={5} className="text-end fw-bold text-muted fs-8 pe-4">TOTAL</td>
                                            <td className="text-center fw-bold text-primary">{stats.total_man_power}</td>
                                            <td className="text-center fw-bold text-primary">{stats.total_time}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {stats.usage_count === 0 && (
                        <div className="card card-flush border-0 shadow-sm mt-5 border-danger" style={{ borderWidth: 1 }}>
                            <div className="card-body py-5 px-6">
                                <div className="d-flex align-items-start gap-3">
                                    <i className="bi bi-exclamation-octagon text-danger fs-3 mt-1"></i>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-danger mb-1">Danger Zone</div>
                                        <div className="text-muted fs-7 mb-3">
                                            Template ini belum digunakan di record PM manapun. Hapus permanen jika tidak diperlukan.
                                        </div>
                                        <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
                                            <i className="bi bi-trash me-1"></i>Hapus Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className="col-6">
            <label className="fs-9 fw-semibold text-gray-400 text-uppercase d-block mb-1">{label}</label>
            <div className="fs-7 fw-semibold text-gray-900">{value}</div>
        </div>
    );
}