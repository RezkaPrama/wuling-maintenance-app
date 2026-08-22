import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
    fetchRecordWork,
    updateRecordItem,
    uploadItemPhoto,
    completeRecord,
    clearWork,
} from '../../features/record/recordSlice';
import PageToolbar from '../../components/PageToolbar';
import './RecordWork.css';

const DEFAULT_PM_COLUMNS = ['Check', 'Lubricate', 'Cleaning', 'Tighten', 'Measure', 'Replace'];

export default function RecordWorkPage() {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { data, status } = useSelector((s) => s.record.work);

    const [record, setRecord] = useState(null);
    const [items, setItems] = useState([]);
    const [editable, setEditable] = useState(true);
    const [pmColumns, setPmColumns] = useState(DEFAULT_PM_COLUMNS);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [saveState, setSaveState] = useState(null); // {type:'saving'|'ok'|'err', msg}

    useEffect(() => {
        dispatch(fetchRecordWork(id));
        return () => dispatch(clearWork());
    }, [dispatch, id]);

    useEffect(() => {
        if (data) {
            setRecord(data.record);
            setItems((data.items || []).map((it) => ({
                ...it,
                measurementValue: it.measurements?.value ?? '',
                completed_pm_types: it.completed_pm_types || [],
            })));
            setEditable(data.editable);
            setPmColumns(data.pm_columns?.length ? data.pm_columns : DEFAULT_PM_COLUMNS);
            setExpandedIds(new Set(
                (data.items || [])
                    .filter((it) => it.requires_action || (it.photos && it.photos.length > 0))
                    .map((it) => it.id)
            ));
        }
    }, [data]);

    // ── Progress dihitung langsung dari state items (single source of truth) ──
    const progress = useMemo(() => {
        const total = items.length;
        const ok = items.filter((i) => i.status === 'ok').length;
        const ng = items.filter((i) => i.status === 'ng').length;
        const na = items.filter((i) => i.status === 'na').length;
        const pending = items.filter((i) => i.status === 'pending').length;
        const done = ok + ng + na;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, ok, ng, na, pending, percent };
    }, [items]);

    const summary = useMemo(() => {
        let mpPlan = 0, mpActual = 0, timePlan = 0, timeActual = 0, hasDeviation = false;
        items.forEach((it) => {
            mpPlan += it.man_power || 0;
            timePlan += it.time_minutes || 0;
            if (it.actual_man_power) {
                mpActual += parseInt(it.actual_man_power, 10);
                if (parseInt(it.actual_man_power, 10) !== it.man_power) hasDeviation = true;
            }
            if (it.actual_time_minutes) {
                timeActual += parseInt(it.actual_time_minutes, 10);
                if (parseInt(it.actual_time_minutes, 10) !== it.time_minutes) hasDeviation = true;
            }
        });
        return { mpPlan, mpActual, timePlan, timeActual, hasDeviation };
    }, [items]);

    const hasPmSkip = useMemo(() => items.some((it) =>
        it.status !== 'pending' && (it.pm_types || []).some((p) => !(it.completed_pm_types || []).includes(p))
    ), [items]);

    function showSave(type, msg) {
        setSaveState({ type, msg });
        if (type !== 'saving') setTimeout(() => setSaveState(null), 2500);
    }

    function updateLocalItem(itemId, patch) {
        setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
    }

    function buildPayload(item) {
        return {
            status: item.status,
            remarks: item.remarks || '',
            measurements: { value: item.measurementValue || '' },
            completed_pm_types: item.completed_pm_types || [],
            requires_action: !!item.requires_action,
            action_required: item.action_required || '',
            actual_man_power: item.actual_man_power || null,
            actual_time_minutes: item.actual_time_minutes || null,
        };
    }

    async function persistItem(itemId, mergedItem) {
        showSave('saving', 'Menyimpan...');
        const result = await dispatch(updateRecordItem({ recordId: id, itemId, payload: buildPayload(mergedItem) }));
        if (updateRecordItem.fulfilled.match(result)) {
            showSave('ok', 'Tersimpan');
        } else {
            showSave('err', 'Gagal simpan');
        }
    }

    function handleSetStatus(itemId, newStatus) {
        const current = items.find((i) => i.id === itemId);
        const merged = { ...current, status: newStatus };
        updateLocalItem(itemId, { status: newStatus });
        persistItem(itemId, merged);
    }

    function handleTogglePmType(itemId, col) {
        const current = items.find((i) => i.id === itemId);
        const isDone = current.completed_pm_types.includes(col);
        const newDone = isDone ? current.completed_pm_types.filter((c) => c !== col) : [...current.completed_pm_types, col];
        const merged = { ...current, completed_pm_types: newDone };
        updateLocalItem(itemId, { completed_pm_types: newDone });
        persistItem(itemId, merged);
    }

    function handleFieldChange(itemId, field, value) {
        updateLocalItem(itemId, { [field]: value });
    }

    function handleFieldBlur(itemId) {
        const current = items.find((i) => i.id === itemId);
        persistItem(itemId, current);
    }

    function handleToggleActionRequired(itemId) {
        const current = items.find((i) => i.id === itemId);
        const newVal = !current.requires_action;
        const merged = { ...current, requires_action: newVal };
        updateLocalItem(itemId, { requires_action: newVal });
        if (newVal) setExpandedIds((prev) => new Set(prev).add(itemId));
        persistItem(itemId, merged);
    }

    function toggleExpandRow(itemId) {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
            return next;
        });
    }

    async function handleUploadPhoto(itemId, file) {
        if (!file) return;
        showSave('saving', 'Mengupload foto...');
        const result = await dispatch(uploadItemPhoto({ recordId: id, itemId, file }));
        if (uploadItemPhoto.fulfilled.match(result) && result.payload.success) {
            const current = items.find((i) => i.id === itemId);
            updateLocalItem(itemId, { photos: [...(current.photos || []), result.payload.photo] });
            setExpandedIds((prev) => new Set(prev).add(itemId));
            showSave('ok', 'Foto tersimpan');
        } else {
            showSave('err', 'Gagal upload foto');
        }
    }

    async function handleComplete() {
        setCompleting(true);
        const result = await dispatch(completeRecord(id));
        setCompleting(false);
        if (completeRecord.fulfilled.match(result)) {
            setShowCompleteModal(false);
            navigate('/admin/records');
        } else {
            alert(result.payload || 'Gagal menyelesaikan record.');
        }
    }

    if (status === 'loading' || !record) {
        return (
            <div className="d-flex justify-content-center py-20">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="alert alert-danger p-5">
                <div className="fw-bold mb-1">Record tidak ditemukan</div>
                <button type="button" className="btn btn-sm btn-light mt-2" onClick={() => navigate('/admin/records')}>
                    Kembali ke daftar
                </button>
            </div>
        );
    }

    let lastSubEq = '__INIT__';

    return (
        <>
            <PageToolbar title="Pengerjaan PM" menuUtama="Menu Utama" menuItem="Equipment" />

            {/* ── STICKY BAR ── */}
            <div className="work-sticky-bar">
                <div className="container-fluid">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <div className="d-flex align-items-center gap-2">
                            <button type="button" className="btn btn-sm btn-light" onClick={() => navigate('/admin/records')}>
                                <i className="bi bi-arrow-left" />
                            </button>
                            <div>
                                <div className="fw-bold text-gray-800 fs-7 lh-1">{record.record_number}</div>
                                <div className="text-muted fs-8">{record.equipment_name} · {record.pm_cycle}</div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 280 }}>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                            </div>
                            <span className="text-muted fs-8 text-nowrap">{progress.done}/{progress.total}</span>
                        </div>
                        <div className="d-none d-md-flex gap-3 fs-8">
                            <span><span className="fw-bold text-success">{progress.ok}</span> <span className="text-muted">OK</span></span>
                            <span><span className="fw-bold text-danger">{progress.ng}</span> <span className="text-muted">NG</span></span>
                            <span><span className="fw-bold text-muted">{progress.pending}</span> <span className="text-muted">Pending</span></span>
                        </div>
                        <div>
                            {saveState && (
                                <span className={`save-pill ${saveState.type === 'saving' ? 'saving' : saveState.type === 'ok' ? 'saved' : 'err'}`}>
                                    <i className={`bi bi-${saveState.type === 'saving' ? 'arrow-repeat spin' : saveState.type === 'ok' ? 'check-circle' : 'x-circle'} me-1`} />
                                    {saveState.msg}
                                </span>
                            )}
                        </div>
                        <div className="ms-auto d-flex gap-2 align-items-center">
                            <span className="badge bg-primary">{progress.percent}%</span>
                            {editable && (
                                <button
                                    className="btn btn-sm btn-success"
                                    disabled={progress.percent < 100}
                                    onClick={() => setShowCompleteModal(true)}
                                >
                                    <i className="bi bi-check-circle me-1" />Selesaikan PM
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {!editable && (
                <div className="alert alert-light-info d-flex align-items-center p-4 mb-5">
                    <i className="bi bi-info-circle fs-2 me-3" />
                    <div>Record ini berstatus <strong>{record.status}</strong> dan sudah tidak dapat diedit.</div>
                </div>
            )}

            {/* ── HEADER CHECK SHEET ── */}
            <div className="cs-header">
                <div className="cs-header-top">
                    <div className="fw-bold fs-6">
                        <i className="bi bi-file-earmark-check me-2" />Preventive Maintenance Check Sheet
                    </div>
                    <div className="text-end">
                        <div style={{ fontSize: '.68rem', opacity: .6 }}>Doc No</div>
                        <div className="fw-bold fs-7">{record.doc_number}</div>
                    </div>
                </div>
                <div className="cs-header-grid">
                    <div className="cs-header-cell"><div className="lbl">Equipment</div><div className="val">{record.equipment_name}</div></div>
                    <div className="cs-header-cell"><div className="lbl">PM Number</div><div className="val">{record.pm_number || '—'}</div></div>
                    <div className="cs-header-cell"><div className="lbl">Equ. No</div><div className="val">{record.equipment_code}</div></div>
                </div>
                <div className="cs-header-grid" style={{ borderTop: '1px solid #dee2e6' }}>
                    <div className="cs-header-cell"><div className="lbl">ETM Group</div><div className="val">{record.etm_group}</div></div>
                    <div className="cs-header-cell"><div className="lbl">TIS Number</div><div className="val">{record.tis_number || '—'}</div></div>
                    <div className="cs-header-cell d-flex gap-4">
                        <div><div className="lbl">Year</div><div className="val">{new Date(record.maintenance_date).getFullYear()}</div></div>
                        <div><div className="lbl">PM Cycle</div><div className="val"><span className="badge badge-light-primary">{record.pm_cycle}</span></div></div>
                        <div><div className="lbl">PM Status</div><div className="val"><span className="badge badge-light-warning">{record.status}</span></div></div>
                    </div>
                </div>
                <div className="cs-header-grid" style={{ borderTop: '1px solid #dee2e6' }}>
                    <div className="cs-header-cell"><div className="lbl">Prepared by (Teknisi)</div><div className="val">{record.technician_name}</div></div>
                    <div className="cs-header-cell">
                        <div className="lbl">Tanggal · Waktu Mulai</div>
                        <div className="val">
                            {new Date(record.maintenance_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} · {record.start_time}
                        </div>
                    </div>
                    <div className="cs-header-cell"><div className="lbl">Checked by</div><div className="val text-muted">{record.checker_name || '(menunggu)'}</div></div>
                </div>
            </div>

            {/* Legend */}
            <div className="d-flex flex-wrap gap-3 py-3 px-1 align-items-center fs-8">
                <span className="fw-bold text-muted">Status hasil:</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#50cd89', marginRight: 4 }} /><strong>OK</strong> Sesuai standar</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#f1416c', marginRight: 4 }} /><strong>NG</strong> Tidak sesuai standar</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#b5b5c3', marginRight: 4 }} /><strong>N/A</strong> Tidak berlaku</span>
                <span className="ms-3 fw-bold text-muted">PM Type:</span>
                <span className="pm-legend plan"><span style={{ fontSize: '.7rem' }}>■</span> Wajib (plan)</span>
                <span className="pm-legend done"><span style={{ fontSize: '.7rem' }}>✓</span> Sudah dikerjakan</span>
                <span className="pm-legend extra"><span style={{ fontSize: '.7rem' }}>✓</span> Extra (diluar plan)</span>
                <span className="pm-legend skip"><span style={{ fontSize: '.7rem' }}>!</span> Belum dikerjakan</span>
            </div>

            {/* ── TABEL CHECK SHEET ── */}
            <div className="cs-table-wrap">
                <table className="cs-table">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="th-left" style={{ width: 32 }}>No.</th>
                            <th rowSpan={2} className="th-left" style={{ minWidth: 100 }}>Sub Equip.</th>
                            <th rowSpan={2} className="th-left" style={{ minWidth: 180 }}>Check Item</th>
                            <th rowSpan={2} className="th-left" style={{ minWidth: 175 }}>Maintenance Standard</th>
                            <th style={{ borderLeft: '2px solid #3d6494', minWidth: 210 }}>
                                PM Type
                                <div style={{ fontSize: '.58rem', fontWeight: 400, opacity: .75 }}>■ = wajib dari template · centang = sudah dikerjakan</div>
                            </th>
                            <th colSpan={2} style={{ borderLeft: '2px solid #3d6494' }}>
                                Work Time
                                <div style={{ fontSize: '.58rem', fontWeight: 400, opacity: .75 }}>Plan → Aktual</div>
                            </th>
                            <th colSpan={2} style={{ borderLeft: '2px solid #3d6494', minWidth: 150 }}>
                                Hasil Pemeriksaan
                                <div style={{ fontSize: '.6rem', fontWeight: 400, opacity: .8 }}>
                                    {new Date(record.maintenance_date).toLocaleDateString('id-ID')}
                                </div>
                            </th>
                            <th rowSpan={2} style={{ minWidth: 135, borderLeft: '2px solid #3d6494' }}>Keterangan / Remarks</th>
                            <th rowSpan={2} style={{ minWidth: 54, borderLeft: '2px solid #3d6494' }}>Foto</th>
                            <th rowSpan={2} style={{ minWidth: 38, borderLeft: '2px solid #3d6494' }} title="Perlu Tindakan Lanjut">⚠</th>
                        </tr>
                        <tr>
                            <th style={{ borderLeft: '2px solid #3d6494', fontSize: '.62rem', textAlign: 'left', paddingLeft: 10 }}>
                                Check · Lubricate · Cleaning · Tighten · Measure · Replace
                            </th>
                            <th style={{ width: 82, borderLeft: '2px solid #3d6494', fontSize: '.62rem' }}>Man Power<br /><span style={{ opacity: .7 }}>(orang)</span></th>
                            <th style={{ width: 82, fontSize: '.62rem' }}>Time<br /><span style={{ opacity: .7 }}>(menit)</span></th>
                            <th style={{ width: 74, borderLeft: '2px solid #3d6494' }}>Status</th>
                            <th style={{ width: 78, fontSize: '.62rem' }}>Nilai Ukur</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((item) => {
                            const rows = [];
                            if (item.sub_equipment !== lastSubEq) {
                                rows.push(
                                    <tr className="sub-eq-row" key={`sub-${item.id}`}>
                                        <td colSpan={13}>
                                            <i className="bi bi-gear-fill me-2 text-primary opacity-75" style={{ fontSize: '.68rem' }} />
                                            {item.sub_equipment || 'General'}
                                        </td>
                                    </tr>
                                );
                                lastSubEq = item.sub_equipment;
                            }

                            const planTypes = item.pm_types || [];
                            const doneTypes = item.completed_pm_types || [];
                            const hasMeas = planTypes.includes('Measure');
                            const photos = item.photos || [];
                            const st = item.status;
                            const isExpanded = expandedIds.has(item.id);
                            const skippedPlans = planTypes.filter((p) => !doneTypes.includes(p));

                            rows.push(
                                <tr className={`item-row st-${st}`} key={item.id}>
                                    <td className="text-center fw-bold" style={{ color: '#6c757d', fontSize: '.75rem' }}>{item.item_number}</td>
                                    <td className="text-muted" style={{ fontSize: '.72rem' }}>{item.sub_equipment}</td>
                                    <td><div className="fw-semibold" style={{ lineHeight: 1.3, fontSize: '.78rem' }}>{item.check_item}</div></td>
                                    <td style={{ fontSize: '.71rem', color: '#5e6278', lineHeight: 1.3 }}>{item.maintenance_standard}</td>

                                    {/* PM Type */}
                                    <td className="pm-cell" style={{ borderLeft: '2px solid #dee2e6' }}>
                                        <div className="pm-cell-inner">
                                            {pmColumns.map((col) => {
                                                const isPlan = planTypes.includes(col);
                                                const isDone = doneTypes.includes(col);
                                                const isSkip = isPlan && !isDone && st !== 'pending';
                                                return (
                                                    <div className="pm-check-wrap" key={col}>
                                                        <input
                                                            type="checkbox"
                                                            className={`pm-checkbox ${isPlan ? 'is-plan' : 'is-extra'} ${isDone ? 'is-done' : ''} ${isSkip ? 'is-skipped' : ''}`}
                                                            checked={isDone}
                                                            disabled={!editable}
                                                            onChange={() => handleTogglePmType(item.id, col)}
                                                            title={`${col}${isPlan ? ' (wajib dari template)' : ' (extra)'}`}
                                                        />
                                                        <span className="pm-type-label">{col.slice(0, 5)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {skippedPlans.length > 0 && st !== 'pending' && (
                                            <div className="fs-8 text-danger mt-1">
                                                <i className="bi bi-exclamation-triangle me-1" />
                                                {skippedPlans.length} PM Type belum dicentang
                                            </div>
                                        )}
                                    </td>

                                    {/* Man Power */}
                                    <td className="worktime-cell" style={{ borderLeft: '2px solid #dee2e6' }}>
                                        <span className="plan-label">Plan</span>
                                        <span className="plan-val">{item.man_power} org</span>
                                        <input
                                            type="number"
                                            className={`actual-input ${item.actual_man_power ? 'changed' : ''}`}
                                            min={1} max={99}
                                            placeholder={item.man_power}
                                            value={item.actual_man_power ?? ''}
                                            disabled={!editable}
                                            onChange={(e) => handleFieldChange(item.id, 'actual_man_power', e.target.value)}
                                            onBlur={() => handleFieldBlur(item.id)}
                                            title="Aktual jumlah teknisi"
                                        />
                                        <span className="actual-tag">aktual</span>
                                    </td>

                                    {/* Time */}
                                    <td className="worktime-cell">
                                        <span className="plan-label">Plan</span>
                                        <span className="plan-val">{item.time_minutes} mnt</span>
                                        <input
                                            type="number"
                                            className={`actual-input ${item.actual_time_minutes ? 'changed' : ''}`}
                                            min={1} max={9999}
                                            placeholder={item.time_minutes}
                                            value={item.actual_time_minutes ?? ''}
                                            disabled={!editable}
                                            onChange={(e) => handleFieldChange(item.id, 'actual_time_minutes', e.target.value)}
                                            onBlur={() => handleFieldBlur(item.id)}
                                            title="Aktual waktu pengerjaan (menit)"
                                        />
                                        <span className="actual-tag">aktual (mnt)</span>
                                    </td>

                                    {/* Status Result */}
                                    <td className="result-cell" style={{ borderLeft: '2px solid #dee2e6' }}>
                                        <div className="result-btn-group">
                                            <button type="button" className={`result-btn r-ok ${st === 'ok' ? 'active' : ''}`} disabled={!editable} onClick={() => handleSetStatus(item.id, 'ok')} title="OK — Sesuai standar">OK</button>
                                            <button type="button" className={`result-btn r-ng ${st === 'ng' ? 'active' : ''}`} disabled={!editable} onClick={() => handleSetStatus(item.id, 'ng')} title="NG — Tidak sesuai standar">NG</button>
                                            <button type="button" className={`result-btn r-na ${st === 'na' ? 'active' : ''}`} disabled={!editable} onClick={() => handleSetStatus(item.id, 'na')} title="N/A — Tidak berlaku">NA</button>
                                        </div>
                                    </td>

                                    {/* Nilai Ukur */}
                                    <td>
                                        {hasMeas ? (
                                            <input
                                                type="text"
                                                className="meas-inline"
                                                placeholder="nilai..."
                                                value={item.measurementValue}
                                                disabled={!editable}
                                                onChange={(e) => handleFieldChange(item.id, 'measurementValue', e.target.value)}
                                                onBlur={() => handleFieldBlur(item.id)}
                                            />
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '.65rem' }}>—</span>
                                        )}
                                    </td>

                                    {/* Remarks */}
                                    <td style={{ borderLeft: '2px solid #dee2e6' }}>
                                        <input
                                            type="text"
                                            className="remarks-inline"
                                            placeholder="keterangan..."
                                            value={item.remarks || ''}
                                            disabled={!editable}
                                            onChange={(e) => handleFieldChange(item.id, 'remarks', e.target.value)}
                                            onBlur={() => handleFieldBlur(item.id)}
                                        />
                                    </td>

                                    {/* Foto */}
                                    <td className="text-center" style={{ borderLeft: '2px solid #dee2e6' }}>
                                        <div className="d-flex flex-column align-items-center gap-1">
                                            {editable && (
                                                <label className="photo-btn mb-0" style={{ cursor: 'pointer' }} title="Upload foto">
                                                    <i className="bi bi-camera" />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            handleUploadPhoto(item.id, e.target.files?.[0]);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            )}
                                            {photos.length > 0 && (
                                                <span className="photo-count" onClick={() => toggleExpandRow(item.id)}>
                                                    <i className="bi bi-images" /> {photos.length}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Action required */}
                                    <td className="text-center" style={{ borderLeft: '2px solid #dee2e6' }}>
                                        <button
                                            type="button"
                                            className={`action-toggle ${item.requires_action ? 'active' : ''}`}
                                            disabled={!editable}
                                            onClick={() => handleToggleActionRequired(item.id)}
                                            title="Perlu tindakan lanjut"
                                        >
                                            <i className="bi bi-wrench" />
                                        </button>
                                    </td>
                                </tr>
                            );

                            if (isExpanded) {
                                rows.push(
                                    <tr className="expand-row" key={`expand-${item.id}`}>
                                        <td colSpan={13}>
                                            <div className="d-flex flex-wrap gap-4 align-items-start">
                                                <div>
                                                    <div className="text-muted fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
                                                        <i className="bi bi-images me-1" />Foto
                                                    </div>
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        {photos.map((ph, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={ph.url}
                                                                onClick={() => setPreviewPhotoUrl(ph.url)}
                                                                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 5, border: '1.5px solid #dee2e6', cursor: 'pointer' }}
                                                                alt={`Foto item ${item.item_number}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {item.requires_action && (
                                                    <div className="flex-grow-1">
                                                        <div className="text-warning fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
                                                            <i className="bi bi-exclamation-triangle me-1" />Tindakan yang Diperlukan
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Deskripsikan tindakan lanjut..."
                                                            value={item.action_required || ''}
                                                            disabled={!editable}
                                                            onChange={(e) => handleFieldChange(item.id, 'action_required', e.target.value)}
                                                            onBlur={() => handleFieldBlur(item.id)}
                                                            style={{ borderColor: '#ffc107', maxWidth: 400 }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return rows;
                        })}
                    </tbody>

                    <tfoot>
                        <tr style={{ background: '#f5f8fa' }}>
                            <td colSpan={4} className="text-center py-3 fw-bold" style={{ fontSize: '.78rem', color: '#1e3a5f' }}>
                                Checker
                                <div className="fw-normal text-muted mt-1" style={{ minHeight: 24 }}>{record.checker_name || ''}</div>
                            </td>
                            <td colSpan={6} />
                            <td colSpan={3} className="text-center py-3 fw-bold" style={{ fontSize: '.78rem', color: '#1e3a5f', borderLeft: '2px solid #dee2e6' }}>
                                TL Validation
                                <div className="fw-normal text-muted mt-1" style={{ minHeight: 24 }}>{record.validator_name || ''}</div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Summary plan vs aktual */}
            <div className="card card-flush border-0 shadow-sm mt-4">
                <div className="card-body py-4 px-5">
                    <div className="row g-4 align-items-center">
                        <div className="col-md-4">
                            <div className="fw-bold text-gray-800 mb-1">Ringkasan Waktu & Tenaga</div>
                            <div className="text-muted fs-8">Plan dari template vs aktual yang diisi</div>
                        </div>
                        <div className="col-md-8">
                            <div className="row g-3 text-center">
                                <div className="col-3">
                                    <div className="text-muted fs-8 mb-1">Man Power Plan</div>
                                    <div className="fw-bold fs-4 text-gray-800">{summary.mpPlan}</div>
                                    <div className="text-muted fs-8">orang</div>
                                </div>
                                <div className="col-3">
                                    <div className="text-muted fs-8 mb-1">Man Power Aktual</div>
                                    <div className="fw-bold fs-4 text-primary">{summary.mpActual || '—'}</div>
                                    <div className="text-muted fs-8">orang</div>
                                </div>
                                <div className="col-3">
                                    <div className="text-muted fs-8 mb-1">Time Plan</div>
                                    <div className="fw-bold fs-4 text-gray-800">{summary.timePlan}</div>
                                    <div className="text-muted fs-8">menit</div>
                                </div>
                                <div className="col-3">
                                    <div className="text-muted fs-8 mb-1">Time Aktual</div>
                                    <div className="fw-bold fs-4 text-primary">{summary.timeActual || '—'}</div>
                                    <div className="text-muted fs-8">menit</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NG Summary */}
            {progress.ng > 0 && (
                <div className="mt-4">
                    <div className="alert alert-light-danger border border-danger border-dashed">
                        <div className="fw-bold text-danger mb-2">
                            <i className="bi bi-exclamation-triangle me-2" />Item NG — {progress.ng} item
                        </div>
                        <div>
                            {items.filter((i) => i.status === 'ng').map((ngItem) => (
                                <div className="d-flex align-items-center gap-2 mb-1" key={ngItem.id}>
                                    <span className="badge badge-light-danger">{ngItem.item_number}</span>
                                    <span className="fs-8">{ngItem.check_item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-10 d-lg-none" />

            {/* Mobile float */}
            {editable && (
                <div className="d-lg-none position-fixed bottom-0 start-0 end-0 p-3" style={{ background: 'rgba(255,255,255,.95)', borderTop: '1px solid #eff2f5', zIndex: 150 }}>
                    <button className="btn btn-success w-100" disabled={progress.percent < 100} onClick={() => setShowCompleteModal(true)}>
                        <i className="bi bi-check-circle me-1" />
                        Selesaikan PM · {progress.percent}%
                    </button>
                </div>
            )}

            {/* Modal Photo Preview */}
            {previewPhotoUrl && (
                <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setPreviewPhotoUrl(null); }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0">
                            <div className="modal-header border-0 pb-0">
                                <button type="button" className="btn-close" onClick={() => setPreviewPhotoUrl(null)} />
                            </div>
                            <div className="modal-body text-center">
                                <img src={previewPhotoUrl} className="img-fluid rounded" style={{ maxHeight: '75vh' }} alt="Preview" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Selesai */}
            {showCompleteModal && (
                <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,.5)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowCompleteModal(false); }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-0 pb-2">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-check-circle-fill text-success me-2" />Selesaikan Pengerjaan PM?
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowCompleteModal(false)} />
                            </div>
                            <div className="modal-body pt-0">
                                <div className="row g-3 text-center mb-4">
                                    <div className="col-4"><div className="fs-1 fw-bold text-success">{progress.ok}</div><div className="text-muted fs-8">OK</div></div>
                                    <div className="col-4"><div className="fs-1 fw-bold text-danger">{progress.ng}</div><div className="text-muted fs-8">NG</div></div>
                                    <div className="col-4"><div className="fs-1 fw-bold text-muted">{progress.na}</div><div className="text-muted fs-8">N/A</div></div>
                                </div>
                                {hasPmSkip && (
                                    <div className="alert alert-light-warning border border-warning border-dashed fs-8 mb-3">
                                        <i className="bi bi-exclamation-triangle me-1" />
                                        <strong>Ada PM Type yang belum dicentang</strong> — pastikan semua pekerjaan yang wajib sudah dilakukan.
                                    </div>
                                )}
                                {summary.hasDeviation && (
                                    <div className="alert alert-light-info border border-info border-dashed fs-8 mb-3">
                                        <i className="bi bi-info-circle me-1" />
                                        Ada deviasi waktu/tenaga dari plan. Pastikan sudah diisi dengan benar.
                                    </div>
                                )}
                                <div className="alert alert-light-secondary fs-8 mb-0">
                                    <i className="bi bi-info-circle me-1" />
                                    Setelah diselesaikan, record dikirim ke Checker untuk divalidasi.
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button type="button" className="btn btn-light" onClick={() => setShowCompleteModal(false)}>Batal</button>
                                <button type="button" className="btn btn-success" onClick={handleComplete} disabled={completing}>
                                    {completing ? (
                                        <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</>
                                    ) : (
                                        <><i className="bi bi-check-lg me-1" />Ya, Selesaikan PM</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}