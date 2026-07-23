import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchFormData,
    fetchEquipmentDetail,
    createEquipment,
    updateEquipment,
    clearMutationState,
    clearDetail,
} from '../../features/equipment/equipmentSlice';
import PageToolbar from '../../components/PageToolbar';

const emptySpec = () => ({ key: '', value: '' });

export default function EquipmentFormPage() {
    const { id } = useParams(); // ada isinya kalau mode edit
    const isEdit = Boolean(id);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { etm_groups, locations } = useSelector((s) => s.equipment.formOptions);
    const detail = useSelector((s) => s.equipment.detail);
    const mutation = useSelector((s) => s.equipment.mutation);

    const [form, setForm] = useState({
        equipment_code: '',
        equipment_name: '',
        pm_number: '',
        tis_number: '',
        etm_group: '',
        location: '',
        status: 'active',
    });
    const [specs, setSpecs] = useState([emptySpec()]);

    useEffect(() => {
        dispatch(fetchFormData());
        if (isEdit) dispatch(fetchEquipmentDetail(id));
        return () => dispatch(clearDetail());
    }, [id]);

    // Isi form begitu data detail (mode edit) selesai dimuat
    useEffect(() => {
        if (isEdit && detail.data) {
            const eq = detail.data.equipment;
            setForm({
                equipment_code: eq.equipment_code,
                equipment_name: eq.equipment_name,
                pm_number: eq.pm_number,
                tis_number: eq.tis_number || '',
                etm_group: eq.etm_group,
                location: eq.location || '',
                status: eq.status,
            });
            const specEntries = Object.entries(detail.data.specifications || {});
            setSpecs(specEntries.length ? specEntries.map(([key, value]) => ({ key, value })) : [emptySpec()]);
        }
    }, [detail.data]);

    const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const handleSpecChange = (index, field, value) => {
        setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const addSpecRow = () => setSpecs((prev) => [...prev, emptySpec()]);
    const removeSpecRow = (index) => setSpecs((prev) => prev.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearMutationState());

        const payload = {
            ...form,
            spec_key: specs.map((s) => s.key),
            spec_value: specs.map((s) => s.value),
        };

        const action = isEdit
            ? await dispatch(updateEquipment({ id, payload }))
            : await dispatch(createEquipment(payload));

        if (updateEquipment.fulfilled.match(action) || createEquipment.fulfilled.match(action)) {
            const newId = isEdit ? id : action.payload.equipment.id;
            navigate(`/admin/equipment/${newId}`);
        }
        // Kalau rejected (422), mutation.fieldErrors otomatis ke-update lewat slice,
        // dan ditampilkan di bawah masing-masing input (lihat <FieldError /> di bawah).
    };

    const fieldError = (name) => mutation.fieldErrors?.[name]?.[0];

    return (
        <>
            <PageToolbar
                title={isEdit ? 'Edit Equipment' : 'Tambah Equipment'}
                menuUtama="Menu Utama"
                menuItem="Equipment"
            />
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{isEdit ? 'Edit Equipment' : 'Tambah Equipment'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="card-body row g-4">
                        {mutation.error && (
                            <div className="col-12">
                                <div className="alert alert-danger">{mutation.error}</div>
                            </div>
                        )}

                    <div className="col-md-6">
                        <label className="form-label required">Kode Equipment</label>
                        <input
                            className="form-control"
                            value={form.equipment_code}
                            onChange={(e) => handleChange('equipment_code', e.target.value)}
                        />
                        <FieldError message={fieldError('equipment_code')} />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label required">Nama Equipment</label>
                        <input
                            className="form-control"
                            value={form.equipment_name}
                            onChange={(e) => handleChange('equipment_name', e.target.value)}
                        />
                        <FieldError message={fieldError('equipment_name')} />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label required">PM Number</label>
                        <input
                            className="form-control"
                            value={form.pm_number}
                            onChange={(e) => handleChange('pm_number', e.target.value)}
                        />
                        <FieldError message={fieldError('pm_number')} />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">TIS Number</label>
                        <input
                            className="form-control"
                            value={form.tis_number}
                            onChange={(e) => handleChange('tis_number', e.target.value)}
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label required">ETM Group</label>
                        <input
                            className="form-control"
                            list="etm-group-options"
                            value={form.etm_group}
                            onChange={(e) => handleChange('etm_group', e.target.value)}
                        />
                        <datalist id="etm-group-options">
                            {etm_groups.map((g) => <option key={g} value={g} />)}
                        </datalist>
                        <FieldError message={fieldError('etm_group')} />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">Lokasi</label>
                        <input
                            className="form-control"
                            list="location-options"
                            value={form.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                        />
                        <datalist id="location-options">
                            {locations.map((l) => <option key={l} value={l} />)}
                        </datalist>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label required">Status</label>
                        <select
                            className="form-select"
                            value={form.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                        >
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* ── Specifications dinamis ── */}
                    <div className="col-12">
                        <label className="form-label">Spesifikasi</label>
                        {specs.map((s, i) => (
                            <div className="d-flex gap-3 mb-2" key={i}>
                                <input
                                    className="form-control"
                                    placeholder="Nama spek (mis. Voltage)"
                                    value={s.key}
                                    onChange={(e) => handleSpecChange(i, 'key', e.target.value)}
                                />
                                <input
                                    className="form-control"
                                    placeholder="Nilai (mis. 220V)"
                                    value={s.value}
                                    onChange={(e) => handleSpecChange(i, 'value', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="btn btn-icon btn-light-danger"
                                    onClick={() => removeSpecRow(i)}
                                    disabled={specs.length === 1}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-light-primary" onClick={addSpecRow}>
                            + Tambah Spesifikasi
                        </button>
                    </div>
                </div>

                    <div className="card-footer d-flex justify-content-end gap-3">
                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => navigate('/admin/equipment')}
                        >
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.status === 'loading'}>
                            {mutation.status === 'loading' ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

function FieldError({ message }) {
    if (!message) return null;
    return <div className="text-danger fs-7 mt-1">{message}</div>;
}