import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
    fetchScheduleFormData,
    fetchScheduleDetail,
    createSchedule,
    updateSchedule,
    clearDetail,
    clearMutationState,
} from '../../features/schedule/scheduleSlice';
import PageToolbar from '../../components/PageToolbar';

const CYCLE_OPTIONS = [
    { value: '1M', label: '1 Bulan', desc: 'Setiap bulan', icon: 'bi-calendar-date' },
    { value: '3M', label: '3 Bulan', desc: 'Tiap 3 bulan', icon: 'bi-calendar-week' },
    { value: '6M', label: '6 Bulan', desc: 'Tiap 6 bulan', icon: 'bi-calendar-month' },
    { value: '1Y', label: '1 Tahun', desc: 'Setiap tahun', icon: 'bi-calendar3' },
];

const STATUS_META = {
    pending: { label: 'Pending', badge: 'badge-light-info' },
    due: { label: 'Due', badge: 'badge-light-warning' },
    overdue: { label: 'Overdue', badge: 'badge-light-danger' },
    completed: { label: 'Completed', badge: 'badge-light-success' },
};

// Preview murni di client — server tetap hitung ulang & jadi sumber kebenaran final
function previewNextMaintenance(lastDateStr, cycle) {
    if (!lastDateStr || !cycle) return null;
    const monthsToAdd = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[cycle];
    const d = new Date(lastDateStr);
    d.setMonth(d.getMonth() + monthsToAdd);
    return d;
}

function previewStatus(dateObj) {
    if (!dateObj) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDay = Math.round((dateObj - today) / 86400000);
    if (diffDay < 0) return 'overdue';
    if (diffDay <= 14) return 'due'; // samakan dengan DUE_THRESHOLD_DAYS backend
    return 'pending';
}

export default function ScheduleFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { equipment_list: equipmentList = [], existing_schedules: existingSchedules = [] } =
        useSelector((s) => s.schedule.formOptions);
    const { data: detailData, status: detailStatus } = useSelector((s) => s.schedule.detail);
    const { status: mutationStatus, error: mutationError, fieldErrors } = useSelector((s) => s.schedule.mutation);

    const [equipmentId, setEquipmentId] = useState('');
    const [equipmentSearch, setEquipmentSearch] = useState('');
    const [pmCycle, setPmCycle] = useState('');
    const [lastMaintenance, setLastMaintenance] = useState('');

    useEffect(() => {
        dispatch(fetchScheduleFormData());
        return () => dispatch(clearMutationState());
    }, [dispatch]);

    useEffect(() => {
        if (isEdit) dispatch(fetchScheduleDetail(id));
        return () => dispatch(clearDetail());
    }, [dispatch, id, isEdit]);

    // FIX: show() balikin { success, data }, bukan { schedule }
    useEffect(() => {
        if (isEdit && detailData?.data) {
            const s = detailData.data;
            setEquipmentId(String(s.equipment_id));
            setPmCycle(s.pm_cycle);
            setLastMaintenance(s.last_maintenance ? s.last_maintenance.slice(0, 10) : '');
        }
    }, [isEdit, detailData]);

    const filteredEquipment = useMemo(() => {
        const q = equipmentSearch.trim().toLowerCase();
        if (!q) return equipmentList;
        return equipmentList.filter(
            (eq) => eq.equipment_code.toLowerCase().includes(q) || eq.equipment_name.toLowerCase().includes(q)
        );
    }, [equipmentList, equipmentSearch]);

    const selectedEquipment = equipmentList.find((eq) => String(eq.id) === String(equipmentId));

    // Duplicate check: 1 equipment = 1 jadwal AKTIF (bukan per-cycle), sesuai kontrak backend
    const duplicateSchedule = useMemo(() => {
        if (!equipmentId) return null;
        return existingSchedules.find(
            (s) =>
                String(s.equipment_id) === String(equipmentId) &&
                (!isEdit || String(s.id) !== String(id))
        );
    }, [equipmentId, existingSchedules, isEdit, id]);

    const previewNext = lastMaintenance ? previewNextMaintenance(lastMaintenance, pmCycle) : null;
    const previewStatusValue = previewNext ? previewStatus(previewNext) : null;
    const previewStatusMeta = previewStatusValue ? STATUS_META[previewStatusValue] : null;

    const canSubmit = equipmentId && pmCycle && !duplicateSchedule && mutationStatus !== 'loading';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        // Cuma kirim field yang benar-benar diproses backend
        const payload = {
            equipment_id: equipmentId,
            pm_cycle: pmCycle,
            last_maintenance: lastMaintenance || null,
        };

        const action = isEdit
            ? await dispatch(updateSchedule({ id, payload }))
            : await dispatch(createSchedule(payload));

        const success = isEdit ? updateSchedule.fulfilled.match(action) : createSchedule.fulfilled.match(action);
        if (success) navigate('/admin/schedules');
    };

    if (isEdit && detailStatus === 'loading') {
        return (
            <div className="d-flex justify-content-center py-20">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    return (
        <>
            <PageToolbar title={isEdit ? 'Edit Jadwal PM' : 'Tambah Jadwal PM Baru'} menuUtama="Menu Utama" menuItem="Schedule PM" />

            <div className="d-flex align-items-center justify-content-between mb-6">
                <h1 className="fs-3 fw-bold text-gray-900 my-0">{isEdit ? 'Edit Jadwal PM' : 'Tambah Jadwal PM Baru'}</h1>
                <button type="button" className="btn btn-light btn-sm" onClick={() => navigate('/admin/schedules')}>
                    <i className="bi bi-arrow-left me-1" />Kembali
                </button>
            </div>

            {mutationError && (
                <div className="alert alert-danger d-flex align-items-center p-4 mb-5">
                    <i className="bi bi-x-circle fs-2 text-danger me-3 flex-shrink-0" />
                    <div>
                        <div className="fw-bold mb-1">Gagal menyimpan:</div>
                        <div className="fs-7">{mutationError}</div>
                        {fieldErrors && (
                            <ul className="mb-0 ps-3 mt-1">
                                {Object.values(fieldErrors).flat().map((msg, i) => <li key={i} className="fs-8">{msg}</li>)}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-5 mb-10">
                    <div className="col-lg-8">
                        <div className="card shadow-lg">
                            <div className="card-body p-8">

                                <SectionTitle>Pilih Equipment</SectionTitle>
                                <div className="mb-6">
                                    <label className="form-label fw-bold required">Equipment</label>
                                    {isEdit ? (
                                        // Equipment tidak bisa diubah saat edit (konsisten dengan Blade lama)
                                        <div className="alert alert-light d-flex align-items-center py-4 mb-0">
                                            <div className="symbol symbol-40px me-4">
                                                <span className="symbol-label bg-light-primary"><i className="bi bi-cpu fs-3 text-primary" /></span>
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="fw-bold text-gray-900 fs-6">{selectedEquipment?.equipment_name || '—'}</div>
                                                <div className="text-muted fs-8">
                                                    {selectedEquipment?.equipment_code}
                                                    {selectedEquipment?.etm_group ? ` · ${selectedEquipment.etm_group}` : ''}
                                                </div>
                                            </div>
                                            <span className="badge badge-light-success fw-bold"><i className="bi bi-lock me-1" />Tidak dapat diubah</span>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm mb-1"
                                                placeholder="Cari kode/nama equipment..."
                                                value={equipmentSearch}
                                                onChange={(e) => setEquipmentSearch(e.target.value)}
                                            />
                                            <select className="form-select" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} required>
                                                <option value="">— Pilih Equipment —</option>
                                                {filteredEquipment.map((eq) => {
                                                    const hasSchedule = existingSchedules.some((s) => String(s.equipment_id) === String(eq.id));
                                                    return (
                                                        <option key={eq.id} value={eq.id}>
                                                            [{eq.equipment_code}] {eq.equipment_name}{eq.etm_group ? ` — ${eq.etm_group}` : ''}
                                                            {hasSchedule ? ' (sudah punya jadwal)' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {selectedEquipment && (
                                                <div className="mt-3 p-3 bg-light rounded fs-8 text-muted">
                                                    <i className="bi bi-cpu me-2" />
                                                    {selectedEquipment.equipment_code} · {selectedEquipment.machine_category || '-'} · {selectedEquipment.etm_group || '-'}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <SectionTitle className="mt-6">PM Cycle</SectionTitle>
                                <div className="row g-3 mb-2">
                                    {CYCLE_OPTIONS.map((c) => (
                                        <div className="col-md-3 col-6" key={c.value}>
                                            <label
                                                className={`d-block rounded p-3 ${pmCycle === c.value ? 'border border-primary bg-primary bg-opacity-10' : 'border border-2'}`}
                                                style={{ cursor: 'pointer', borderColor: pmCycle === c.value ? undefined : '#e4e6ef' }}
                                            >
                                                <input type="radio" name="pm_cycle" value={c.value} checked={pmCycle === c.value}
                                                    onChange={() => setPmCycle(c.value)} className="d-none" />
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className={`bi ${c.icon} fs-3 text-primary`} />
                                                    <div>
                                                        <div className="fw-bold text-gray-900 fs-8">{c.label}</div>
                                                        <div className="text-muted" style={{ fontSize: 10 }}>{c.desc}</div>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                {duplicateSchedule && (
                                    <div className="alert alert-warning d-flex align-items-center py-3 mb-4 mt-3">
                                        <i className="bi bi-exclamation-triangle me-2 text-warning fs-5" />
                                        <div className="fs-8">
                                            Equipment ini sudah memiliki jadwal PM aktif (cycle {duplicateSchedule.pm_cycle}, status &quot;{duplicateSchedule.status}&quot;).
                                            Setiap equipment hanya boleh punya satu jadwal aktif — buka menu Edit jadwal tersebut.
                                        </div>
                                    </div>
                                )}

                                <SectionTitle className="mt-2">Jadwal Tanggal</SectionTitle>
                                <div className="text-muted fs-8 mb-4">
                                    Jadwal Berikutnya dihitung <strong>otomatis</strong> oleh sistem dari Tanggal Terakhir Maintenance + PM Cycle.
                                </div>
                                <div className="row g-5 mb-2">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Tanggal Terakhir Maintenance</label>
                                        <input type="date" className="form-control" value={lastMaintenance}
                                            onChange={(e) => setLastMaintenance(e.target.value)} />
                                        <div className="form-text text-muted fs-8">Kosongkan jika belum pernah PM — sistem pakai hari ini.</div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Jadwal Berikutnya (Otomatis)</label>
                                        <div className="form-control bg-light d-flex align-items-center justify-content-between">
                                            <span className="fw-semibold">
                                                {previewNext ? previewNext.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </span>
                                            {previewStatusMeta && <span className={`badge ${previewStatusMeta.badge} fw-bold`}>{previewStatusMeta.label}</span>}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: 10 }}>*Preview browser — dihitung ulang di server saat disimpan.</div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card shadow-lg mb-5 border border-primary border-dashed">
                            <div className="card-body p-5">
                                <div className="fw-bold text-primary fs-7 mb-3"><i className="bi bi-info-circle me-1" />Panduan</div>
                                <ul className="text-muted fs-8 mb-0 ps-3">
                                    <li className="mb-2">Setiap equipment hanya punya <strong>satu jadwal PM aktif</strong>.</li>
                                    <li className="mb-2">Jadwal Berikutnya & status dihitung <strong>otomatis</strong> oleh sistem.</li>
                                    <li className="mb-2"><strong>Due</strong>: ≤ 14 hari sebelum jadwal.</li>
                                    <li><strong>Overdue</strong>: sudah lewat tanggal jadwal.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="card shadow-lg mb-5">
                            <div className="card-body p-5">
                                <div className="fw-bold text-gray-700 fs-7 mb-3">Ringkasan Jadwal</div>
                                <div className="d-flex flex-column gap-2 fs-8">
                                    <SummaryRow label="Equipment" value={selectedEquipment?.equipment_code || '—'} />
                                    <SummaryRow label="PM Cycle" value={pmCycle || '—'} />
                                    <SummaryRow
                                        label="Next PM"
                                        value={previewNext ? previewNext.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-lg">
                            <div className="card-body p-5 d-flex flex-column gap-3">
                                <button type="submit" className="btn btn-primary w-100" disabled={!canSubmit}>
                                    {mutationStatus === 'loading' ? (
                                        <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</>
                                    ) : (<><i className="bi bi-save me-1" />{isEdit ? 'Simpan Perubahan' : 'Simpan Jadwal'}</>)}
                                </button>
                                <button type="button" className="btn btn-light w-100" onClick={() => navigate('/admin/schedules')}>Batal</button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

function SectionTitle({ children, className = '' }) {
    return (
        <div className={className} style={{
            fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
            color: 'var(--bs-gray-500)', paddingBottom: 6, borderBottom: '1px solid var(--bs-gray-200)', marginBottom: 18,
        }}>
            {children}
        </div>
    );
}

function SummaryRow({ label, value }) {
    return (
        <div className="d-flex justify-content-between">
            <span className="text-muted">{label}</span>
            <span className="fw-semibold text-end">{value}</span>
        </div>
    );
}