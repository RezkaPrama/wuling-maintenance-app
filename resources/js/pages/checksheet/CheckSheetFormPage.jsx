import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchTemplateFormData,
    fetchTemplateDetail,
    createTemplate,
    updateTemplate,
    clearMutationState,
    clearDetail,
} from '../../features/checksheet/checkSheetSlice';
import PageToolbar from '../../components/PageToolbar';

const CYCLE_OPTIONS = [
    { value: '1M', label: '1 Bulan' },
    { value: '3M', label: '3 Bulan' },
    { value: '6M', label: '6 Bulan' },
    { value: '1Y', label: '1 Tahun' },
];

let rowKeySeq = 0;
const newRow = () => ({
    key: `row-${rowKeySeq++}`,
    sub_equipment: '',
    check_item: '',
    maintenance_standard: '',
    pm_types: [],
    man_power: 1,
    time_minutes: '',
});

export default function CheckSheetFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { pm_types, machine_categories, current_defaults } = useSelector(
        (s) => s.checksheet.formOptions
    );
    const detail = useSelector((s) => s.checksheet.detail);
    const mutation = useSelector((s) => s.checksheet.mutation);

    const [form, setForm] = useState({
        template_name: '',
        doc_number: '',
        pm_cycle: '',
        default_for_etm_group: '', // isinya machine_category — WAJIB diisi, ini sekarang penentu cakupan template
    });
    const [items, setItems] = useState([newRow(), newRow(), newRow()]);
    const [rowErrors, setRowErrors] = useState({}); // { [rowKey]: 'pm_types' } dst
    const lastFocusedSubEqKey = useRef(null);
    const categorySelectRef = useRef(null); // ref buat elemen <select> yang di-select2-kan

    useEffect(() => {
        dispatch(fetchTemplateFormData());
        if (isEdit) dispatch(fetchTemplateDetail(id));
        return () => dispatch(clearDetail());
    }, [id]);

    // Prefill form + items begitu detail (mode edit) selesai dimuat
    useEffect(() => {
        if (isEdit && detail.data) {
            const t = detail.data.template;
            setForm({
                template_name: t.template_name,
                doc_number: t.doc_number,
                pm_cycle: t.pm_cycle,
                default_for_etm_group: t.default_for_etm_group || '',
            });
            const loadedItems = (detail.data.items || []).map((it) => ({
                key: `row-${rowKeySeq++}`,
                sub_equipment: it.sub_equipment || '',
                check_item: it.check_item,
                maintenance_standard: it.maintenance_standard,
                pm_types: it.pm_types || [],
                man_power: it.man_power,
                time_minutes: it.time_minutes,
            }));
            if (loadedItems.length > 0) setItems(loadedItems);
        }
    }, [detail.data]);

    // ── Init Select2 untuk Kategori Mesin ───────────────────────────
    // Select2 itu plugin jQuery (bukan React), jadi HARUS di-init/destroy
    // manual lewat useEffect + ref — nggak bisa cuma pakai onChange biasa.
    // Reinit tiap kali `machine_categories` berubah, karena optionnya
    // masih kosong saat render pertama (sebelum fetchTemplateFormData
    // selesai), dan Select2 nggak otomatis pick up <option> baru yang
    // ditambahin belakangan tanpa di-refresh.
    useEffect(() => {
        const $ = window.jQuery || window.$;
        if (!$ || !$.fn || !$.fn.select2 || !categorySelectRef.current) return;

        const $select = $(categorySelectRef.current);
        $select.select2({
            placeholder: '— Pilih Kategori Mesin —',
            allowClear: true,
            width: '100%',
        });

        // Selection dari user -> update state React
        $select.on('change', function () {
            handleFormChange('default_for_etm_group', this.value);
        });

        return () => {
            $select.off('change');
            if ($select.data('select2')) $select.select2('destroy');
        };
    }, [machine_categories]);

    // ── Sync value ke Select2 kalau berubah dari luar (misal prefill Edit) ──
    // Select2 "menyembunyikan" <select> asli dan bikin tampilan sendiri,
    // jadi begitu React ubah value <select> secara programatik (prefill),
    // Select2 nggak otomatis ikut update tampilannya tanpa dipanggil manual.
    useEffect(() => {
        const $ = window.jQuery || window.$;
        if (!$ || !$.fn || !$.fn.select2 || !categorySelectRef.current) return;

        const $select = $(categorySelectRef.current);
        if ($select.data('select2') && $select.val() !== form.default_for_etm_group) {
            $select.val(form.default_for_etm_group).trigger('change');
        }
    }, [form.default_for_etm_group]);

    const handleFormChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const handleItemChange = (key, field, value) => {
        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
    };

    const togglePmType = (key, code) => {
        setItems((prev) =>
            prev.map((it) => {
                if (it.key !== key) return it;
                const has = it.pm_types.includes(code);
                return { ...it, pm_types: has ? it.pm_types.filter((c) => c !== code) : [...it.pm_types, code] };
            })
        );
    };

    const addItemRow = () => setItems((prev) => [...prev, newRow()]);
    const removeItemRow = (key) => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));

    const moveRow = (key, direction) => {
        setItems((prev) => {
            const idx = prev.findIndex((it) => it.key === key);
            const swapWith = idx + direction;
            if (swapWith < 0 || swapWith >= prev.length) return prev;
            const copy = [...prev];
            [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
            return copy;
        });
    };

    // ── Sub Equipment quick-fill tags ──────────────────────────────
    const subEqTags = [...new Set(items.map((it) => it.sub_equipment.trim()).filter(Boolean))];
    const fillSubEquipment = (tag) => {
        if (lastFocusedSubEqKey.current) {
            handleItemChange(lastFocusedSubEqKey.current, 'sub_equipment', tag);
        }
    };

    // ── Summary ──────────────────────────────────────────────────
    const totalManPower = items.reduce((sum, it) => sum + (parseInt(it.man_power) || 0), 0);
    const totalTime = items.reduce((sum, it) => sum + (parseInt(it.time_minutes) || 0), 0);

    // ── Cek konflik "default untuk kategori" ───────────────────────
    const conflictingDefault = form.default_for_etm_group
        ? current_defaults.find(
              (d) => d.default_for_etm_group === form.default_for_etm_group && String(d.id) !== String(id)
          )
        : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearMutationState());

        // Validasi item: check_item, maintenance_standard, pm_types minimal 1
        const newRowErrors = {};
        items.forEach((it) => {
            if (!it.check_item.trim() || !it.maintenance_standard.trim() || it.pm_types.length === 0) {
                newRowErrors[it.key] = true;
            }
        });
        setRowErrors(newRowErrors);
        if (Object.keys(newRowErrors).length > 0) {
            alert('Ada item yang belum lengkap: Check Item, Maintenance Standard wajib diisi, dan PM Type minimal 1.');
            return;
        }

        const payload = {
            template_name: form.template_name,
            doc_number: form.doc_number,
            pm_cycle: form.pm_cycle,
            default_for_etm_group: form.default_for_etm_group,
            items: items.map((it) => ({
                sub_equipment: it.sub_equipment,
                check_item: it.check_item,
                maintenance_standard: it.maintenance_standard,
                pm_types: it.pm_types,
                man_power: it.man_power,
                time_minutes: it.time_minutes,
            })),
        };

        const action = isEdit
            ? await dispatch(updateTemplate({ id, payload }))
            : await dispatch(createTemplate(payload));

        if (updateTemplate.fulfilled.match(action)) {
            navigate(`/admin/check-sheet/templates/${id}`);
        } else if (createTemplate.fulfilled.match(action)) {
            navigate(`/admin/check-sheet/templates/${action.payload.template_id}`);
        }
    };

    const fieldError = (name) => mutation.fieldErrors?.[name]?.[0];

    return (
        <>
            <PageToolbar
                title={isEdit ? 'Edit Template' : 'Buat Template Baru'}
                menuUtama="Menu Utama"
                menuItem="Check Sheet"
            />

            <div className="d-flex align-items-center gap-3 mb-6">
                <button type="button" className="btn btn-sm btn-light" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left"></i>
                </button>
                <div>
                    <h1 className="fs-2 fw-bold text-gray-900 mb-0">
                        {isEdit ? 'Edit Template' : 'Buat Template Baru'}
                    </h1>
                    <span className="text-muted fs-6">
                        {isEdit ? 'Ubah header dan item check sheet' : 'Definisikan check sheet items untuk equipment dan PM cycle tertentu'}
                    </span>
                </div>
            </div>

            {mutation.error && (
                <div className="alert alert-danger mb-5">
                    <div className="fw-bold mb-1"><i className="bi bi-exclamation-triangle me-2"></i>{mutation.error}</div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-5">

                    {/* ── KIRI: Info Template ── */}
                    <div className="col-lg-4">
                        <div className="card card-flush border-0 shadow-lg mb-5">
                            <div className="card-header border-0 pt-6">
                                <h3 className="card-title fw-bold fs-5">
                                    <i className="bi bi-info-circle me-2 text-primary"></i>Info Template
                                </h3>
                            </div>
                            <div className="card-body pt-2">

                                <div className="mb-4">
                                    <label className="form-label fw-semibold required">Nama Template</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Contoh: PM 6 Bulan Welding Robot"
                                        value={form.template_name}
                                        onChange={(e) => handleFormChange('template_name', e.target.value)}
                                        required
                                    />
                                    <FieldError message={fieldError('template_name')} />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-semibold required">Doc Number</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Contoh: ETM-PM-WLD-001"
                                        value={form.doc_number}
                                        onChange={(e) => handleFormChange('doc_number', e.target.value)}
                                        required
                                    />
                                    <FieldError message={fieldError('doc_number')} />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-semibold required">PM Cycle</label>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {CYCLE_OPTIONS.map((c) => (
                                            <label
                                                key={c.value}
                                                className={`text-center py-2 rounded border fw-semibold fs-7 ${
                                                    form.pm_cycle === c.value
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-light border text-muted'
                                                }`}
                                                style={{ cursor: 'pointer', flex: '1 1 calc(50% - 4px)', minWidth: 90 }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="pm_cycle"
                                                    value={c.value}
                                                    className="d-none"
                                                    checked={form.pm_cycle === c.value}
                                                    onChange={(e) => handleFormChange('pm_cycle', e.target.value)}
                                                />
                                                {c.label}
                                            </label>
                                        ))}
                                    </div>
                                    <FieldError message={fieldError('pm_cycle')} />
                                </div>

                                {/* ── Kategori Mesin — sekarang WAJIB, menggantikan pilih Equipment satu-satu ── */}
                                <div className="mb-4 border-top pt-4">
                                    <label className="form-label fw-semibold required">
                                        <i className="bi bi-diagram-3 me-1 text-primary"></i>Kategori Mesin
                                    </label>
                                    <select
                                        ref={categorySelectRef}
                                        className="form-select"
                                        defaultValue={form.default_for_etm_group}
                                        required
                                    >
                                        <option value="">— Pilih Kategori Mesin —</option>
                                        {machine_categories.map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                    <div className="text-muted fs-8 mt-1">
                                        Template ini otomatis berlaku untuk SEMUA equipment dengan kategori mesin ini —
                                        tidak perlu pilih equipment satu per satu.
                                    </div>
                                    <FieldError message={fieldError('default_for_etm_group')} />
                                    {conflictingDefault && (
                                        <div className="alert alert-warning fs-8 py-2 px-3 mt-2 mb-0">
                                            <i className="bi bi-exclamation-triangle me-1"></i>
                                            Kategori ini sudah dipegang template <strong>"{conflictingDefault.template_name}"</strong>.
                                            Lanjut simpan akan menggantikannya.
                                        </div>
                                    )}
                                </div>

                                {/* PM Types Legend */}
                                <div className="border-top pt-4 mt-2">
                                    <div className="text-muted fs-8 fw-semibold mb-2">Legenda Warna PM Type:</div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {pm_types.map((pt) => (
                                            <span
                                                key={pt.id}
                                                className="badge fw-semibold"
                                                style={{
                                                    background: `${pt.color_code || '#6c757d'}20`,
                                                    color: pt.color_code || '#6c757d',
                                                    border: `1px solid ${pt.color_code || '#6c757d'}50`,
                                                }}
                                            >
                                                {pt.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card card-flush border-0 shadow-lg bg-light-primary">
                            <div className="card-body py-5 px-5">
                                <div className="fw-bold text-gray-800 mb-2 fs-7">
                                    <i className="bi bi-lightbulb text-primary me-2"></i>Tips Pengisian
                                </div>
                                <ul className="text-muted fs-8 ps-3 mb-0">
                                    <li className="mb-1">Isi <strong>Sub Equip.</strong> untuk mengelompokkan item (contoh: "Motor", "Sensor")</li>
                                    <li className="mb-1">Klik tag di atas tabel untuk isi cepat Sub Equipment ke baris yang sedang fokus</li>
                                    <li className="mb-1">Centang <strong>PM Type</strong> sesuai jenis pekerjaan untuk item tersebut</li>
                                    <li>Pakai tombol ↑ / ↓ untuk ubah urutan baris</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* ── KANAN: Item Builder ── */}
                    <div className="col-lg-8">
                        <div className="card card-flush border-0 shadow-lg">
                            <div className="card-header border-0 pt-6 flex-wrap gap-3">
                                <h3 className="card-title fw-bold fs-5">
                                    <i className="bi bi-list-check me-2 text-primary"></i>
                                    Check Sheet Items
                                    <span className="badge badge-light-primary ms-2 fs-8">{items.length} item</span>
                                </h3>
                                <div className="card-toolbar d-flex gap-2 align-items-center">
                                    <div className="text-muted fs-8 d-none d-md-flex align-items-center gap-3 me-3">
                                        <span>Total MP: <strong>{totalManPower}</strong></span>
                                        <span>Total Time: <strong>{totalTime}</strong> mnt</span>
                                    </div>
                                    <button type="button" className="btn btn-sm btn-light-primary" onClick={addItemRow}>
                                        <i className="bi bi-plus-circle me-1"></i>Tambah Item
                                    </button>
                                </div>
                            </div>

                            <div className="card-body pt-2 px-4 pb-4">
                                {subEqTags.length > 0 && (
                                    <div className="d-flex align-items-center gap-2 flex-wrap mb-3 p-3 rounded" style={{ background: '#f8f9ff' }}>
                                        <span className="text-muted fs-8 fw-semibold">Sub Equipment:</span>
                                        {subEqTags.map((tag) => (
                                            <span
                                                key={tag}
                                                role="button"
                                                onClick={() => fillSubEquipment(tag)}
                                                className="badge fs-8"
                                                style={{ background: '#eef2ff', color: '#3f51b5', border: '1px dashed #c5cae9', cursor: 'pointer' }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        <span className="text-muted fs-8 ms-2">
                                            <i className="bi bi-info-circle"></i> Klik tag untuk isi cepat ke baris terakhir fokus
                                        </span>
                                    </div>
                                )}

                                <div className="table-responsive">
                                    <table className="table align-middle" style={{ minWidth: 900 }}>
                                        <thead>
                                            <tr className="fs-8 text-uppercase fw-bold" style={{ background: '#1e3a5f', color: '#fff' }}>
                                                <th style={{ width: 50 }}></th>
                                                <th style={{ width: 30 }}>#</th>
                                                <th style={{ width: 110 }}>Sub Equip.</th>
                                                <th style={{ minWidth: 160 }}>Check Item *</th>
                                                <th style={{ minWidth: 160 }}>Maintenance Standard *</th>
                                                <th style={{ minWidth: 260 }}>PM Type *</th>
                                                <th style={{ width: 64 }}>MP</th>
                                                <th style={{ width: 64 }}>Time</th>
                                                <th style={{ width: 36 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((it, idx) => (
                                                <tr key={it.key} className={rowErrors[it.key] ? 'table-danger' : ''}>
                                                    <td className="text-center">
                                                        <div className="d-flex flex-column">
                                                            <button type="button" className="btn btn-sm btn-icon p-0" style={{ height: 16 }} onClick={() => moveRow(it.key, -1)} disabled={idx === 0}>
                                                                <i className="bi bi-caret-up-fill fs-8"></i>
                                                            </button>
                                                            <button type="button" className="btn btn-sm btn-icon p-0" style={{ height: 16 }} onClick={() => moveRow(it.key, 1)} disabled={idx === items.length - 1}>
                                                                <i className="bi bi-caret-down-fill fs-8"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge badge-light">{idx + 1}</span>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Sub Equip."
                                                            value={it.sub_equipment}
                                                            onFocus={() => (lastFocusedSubEqKey.current = it.key)}
                                                            onChange={(e) => handleItemChange(it.key, 'sub_equipment', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <textarea
                                                            className="form-control form-control-sm"
                                                            rows={2}
                                                            placeholder="Nama item yang diperiksa..."
                                                            value={it.check_item}
                                                            onChange={(e) => handleItemChange(it.key, 'check_item', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <textarea
                                                            className="form-control form-control-sm"
                                                            rows={2}
                                                            placeholder="Standar kondisi yang harus dipenuhi..."
                                                            value={it.maintenance_standard}
                                                            onChange={(e) => handleItemChange(it.key, 'maintenance_standard', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {pm_types.map((pt) => {
                                                                const checked = it.pm_types.includes(pt.code);
                                                                const color = pt.color_code || '#6c757d';
                                                                return (
                                                                    <label
                                                                        key={pt.id}
                                                                        className="badge fs-8"
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            border: `1.5px solid ${checked ? color : '#e4e6ef'}`,
                                                                            background: checked ? color : 'transparent',
                                                                            color: checked ? '#fff' : '#5e6278',
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            className="d-none"
                                                                            checked={checked}
                                                                            onChange={() => togglePmType(it.key, pt.code)}
                                                                        />
                                                                        {pt.name}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        {rowErrors[it.key] && it.pm_types.length === 0 && (
                                                            <div className="text-danger fs-9 mt-1">Pilih minimal 1</div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm text-center"
                                                            style={{ width: 124 }}
                                                            min={1} max={99}
                                                            value={it.man_power}
                                                            onChange={(e) => handleItemChange(it.key, 'man_power', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm text-center"
                                                            style={{ width: 124 }}
                                                            min={1} max={9999}
                                                            placeholder="mnt"
                                                            value={it.time_minutes}
                                                            onChange={(e) => handleItemChange(it.key, 'time_minutes', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-icon btn-light-danger"
                                                            onClick={() => removeItemRow(it.key)}
                                                            disabled={items.length === 1}
                                                        >
                                                            <i className="bi bi-trash3" style={{ fontSize: '.7rem' }}></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button type="button" className="btn btn-sm btn-light-primary mt-2" onClick={addItemRow}>
                                    <i className="bi bi-plus me-1"></i>Tambah Item
                                </button>
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-5">
                            <button type="submit" className="btn btn-primary flex-grow-1" disabled={mutation.status === 'loading'}>
                                <i className="bi bi-check-circle me-2"></i>
                                {mutation.status === 'loading' ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Template'}
                            </button>
                            <button type="button" className="btn btn-light" onClick={() => navigate('/admin/check-sheet/templates')}>
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

function FieldError({ message }) {
    if (!message) return null;
    return <div className="text-danger fs-8 mt-1">{message}</div>;
}