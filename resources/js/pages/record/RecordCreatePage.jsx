import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    fetchRecordCreateData,
    fetchTemplatesForSchedule,
    createRecord,
    clearMutationState,
    clearScheduleTemplates,
} from '../../features/record/recordSlice';
import PageToolbar from '../../components/PageToolbar';

function nowTimeValue() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayDateValue() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RecordCreatePage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const scheduleIdParam = searchParams.get('schedule_id') || '';

    const { due_schedules: dueSchedules, status: createDataStatus } = useSelector((s) => s.record.createData);
    const { schedule, templates, status: templatesStatus } = useSelector((s) => s.record.scheduleTemplates);
    const { status: mutationStatus, error: mutationError, fieldErrors } = useSelector((s) => s.record.mutation);

    const [templateId, setTemplateId] = useState('');
    const [maintenanceDate, setMaintenanceDate] = useState(todayDateValue());
    const [startTime, setStartTime] = useState(nowTimeValue());
    const [notes, setNotes] = useState('');

    // Load dropdown jadwal due/overdue kalau belum ada schedule_id di URL
    useEffect(() => {
        if (!scheduleIdParam) {
            dispatch(fetchRecordCreateData());
        }
        return () => dispatch(clearMutationState());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load template options begitu schedule_id ada (dari URL atau dipilih user)
    useEffect(() => {
        if (scheduleIdParam) {
            dispatch(fetchTemplatesForSchedule(scheduleIdParam));
        } else {
            dispatch(clearScheduleTemplates());
        }
        setTemplateId('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleIdParam]);

    const handlePickSchedule = (id) => {
        if (!id) {
            searchParams.delete('schedule_id');
            setSearchParams(searchParams);
            return;
        }
        setSearchParams({ schedule_id: id });
    };

    const canSubmit = scheduleIdParam && templateId && maintenanceDate && startTime && mutationStatus !== 'loading';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        const result = await dispatch(createRecord({
            schedule_id: scheduleIdParam,
            template_id: templateId,
            maintenance_date: maintenanceDate,
            start_time: startTime,
            notes: notes || null,
        }));

        if (createRecord.fulfilled.match(result)) {
            navigate(`/admin/records/${result.payload.data.id}/work`);
        }
    };

    return (
        <>
            <PageToolbar title="Jadwal Preventive Maintenance Record" menuUtama="Menu Utama" menuItem="Maintenance Record" />

            <div className="d-flex align-items-center gap-3 mb-6">
                <button type="button" className="btn btn-sm btn-light" onClick={() => navigate('/admin/records')}>
                    <i className="bi bi-arrow-left" />
                </button>
                <div>
                    <h1 className="fs-2 fw-bold text-gray-900 mb-0">Buat Record PM Baru</h1>
                    <span className="text-muted fs-6">Pilih jadwal dan mulai pelaksanaan preventive maintenance</span>
                </div>
            </div>

            {mutationError && (
                <div className="alert alert-danger d-flex align-items-center mb-5">
                    <i className="bi bi-exclamation-triangle me-3 fs-4" />
                    <div>
                        <div>{mutationError}</div>
                        {fieldErrors && (
                            <ul className="mb-0 ps-3 mt-1">
                                {Object.values(fieldErrors).flat().map((msg, i) => <li key={i} className="fs-8">{msg}</li>)}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-5">
                    {/* ── Kiri: Pilih Jadwal ── */}
                    <div className="col-lg-5">
                        <div className="card card-flush border-0 shadow-sm h-100">
                            <div className="card-header border-0 pt-6">
                                <h3 className="card-title fw-bold fs-5">
                                    <i className="bi bi-calendar-event me-2 text-primary" />Pilih Jadwal PM
                                </h3>
                            </div>
                            <div className="card-body pt-2">
                                {schedule ? (
                                    <div className="alert alert-light-primary border border-primary border-dashed rounded mb-5">
                                        <div className="d-flex align-items-start gap-3">
                                            <i className="bi bi-info-circle text-primary fs-4 mt-1" />
                                            <div className="flex-grow-1">
                                                <div className="fw-bold text-gray-800">{schedule.equipment_name}</div>
                                                <div className="text-muted fs-7">{schedule.equipment_code} · {schedule.etm_group || '-'}</div>
                                                <div className="d-flex gap-2 mt-2">
                                                    <span className="badge badge-light-primary">{schedule.pm_cycle}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-light mt-3"
                                                    onClick={() => handlePickSchedule('')}
                                                >
                                                    <i className="bi bi-arrow-left me-1" />Ganti Jadwal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-5">
                                        <label className="form-label required fw-semibold">Pilih Jadwal (Due/Overdue)</label>
                                        {createDataStatus === 'loading' ? (
                                            <div className="text-muted fs-7">Memuat jadwal...</div>
                                        ) : (
                                            <select
                                                className="form-select"
                                                value={scheduleIdParam}
                                                onChange={(e) => handlePickSchedule(e.target.value)}
                                                required
                                            >
                                                <option value="">— Pilih Jadwal —</option>
                                                {dueSchedules.map((ds) => (
                                                    <option key={ds.id} value={ds.id}>
                                                        [{ds.status.toUpperCase()}] {ds.equipment_name} ({ds.pm_cycle} ·{' '}
                                                        {new Date(ds.next_maintenance).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {createDataStatus === 'succeeded' && dueSchedules.length === 0 && (
                                            <div className="text-muted fs-7 mt-2">
                                                <i className="bi bi-info-circle me-1" />
                                                Tidak ada jadwal yang due atau overdue saat ini.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Pilih Template */}
                                {scheduleIdParam && (
                                    <div className="mb-5">
                                        <label className="form-label required fw-semibold">Check Sheet Template</label>
                                        {templatesStatus === 'loading' ? (
                                            <div className="text-muted fs-7">Memuat template...</div>
                                        ) : (
                                            <>
                                                <select
                                                    className="form-select"
                                                    value={templateId}
                                                    onChange={(e) => setTemplateId(e.target.value)}
                                                    required
                                                >
                                                    <option value="">— Pilih Template —</option>
                                                    {templates.map((t) => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.template_name} ({t.pm_cycle}) · #{t.doc_number}
                                                        </option>
                                                    ))}
                                                </select>
                                                {templates.length === 0 && (
                                                    <div className="text-muted fs-7 mt-2">
                                                        <i className="bi bi-exclamation-triangle me-1 text-warning" />
                                                        Tidak ada template check sheet aktif untuk equipment/cycle ini.
                                                    </div>
                                                )}
                                                {templateId && (
                                                    <div className="text-muted fs-8 mt-1">
                                                        <i className="bi bi-list-check me-1" />
                                                        {templates.find((t) => String(t.id) === String(templateId))?.active_items_count ?? 0} item check sheet
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Tanggal & Waktu */}
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label required fw-semibold">Tanggal Pelaksanaan</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={maintenanceDate}
                                            max={todayDateValue()}
                                            onChange={(e) => setMaintenanceDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label required fw-semibold">Waktu Mulai</label>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Kanan: Catatan + konfirmasi ── */}
                    <div className="col-lg-7">
                        <div className="card card-flush border-0 shadow-sm mb-5">
                            <div className="card-header border-0 pt-6">
                                <h3 className="card-title fw-bold fs-5">
                                    <i className="bi bi-pencil-square me-2 text-primary" />Catatan
                                </h3>
                            </div>
                            <div className="card-body pt-2">
                                <textarea
                                    rows={4}
                                    className="form-control"
                                    placeholder="Catatan tambahan sebelum memulai PM (opsional)..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card card-flush border-0 shadow-sm bg-light-primary mb-5">
                            <div className="card-body py-5 px-6">
                                <div className="d-flex gap-3">
                                    <i className="bi bi-lightbulb text-primary fs-2 mt-1" />
                                    <div>
                                        <div className="fw-bold text-gray-800 mb-2">Alur Pelaksanaan PM</div>
                                        <ol className="text-muted fs-7 ps-3 mb-0">
                                            <li className="mb-1">Buat record → sistem generate nomor otomatis</li>
                                            <li className="mb-1">Isi setiap item check sheet (OK / NG / NA)</li>
                                            <li className="mb-1">Upload foto bukti untuk setiap item</li>
                                            <li className="mb-1">Submit → menunggu validasi Checker</li>
                                            <li>Checker & Validator approve → selesai</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-3">
                            <button type="submit" className="btn btn-primary flex-grow-1" disabled={!canSubmit}>
                                {mutationStatus === 'loading' ? (
                                    <><span className="spinner-border spinner-border-sm me-2" />Membuat Record...</>
                                ) : (
                                    <><i className="bi bi-play-fill me-2" />Mulai Pelaksanaan PM</>
                                )}
                            </button>
                            <button type="button" className="btn btn-light" onClick={() => navigate('/admin/records')}>
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}