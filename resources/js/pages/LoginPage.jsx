import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    loginUser,
    clearError,
    selectAuthLoading,
    selectAuthError,
    selectIsAuthenticated,
} from '../store/slices/authSlice';

const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const isLoading       = useSelector(selectAuthLoading);
    const authError       = useSelector(selectAuthError);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const [formData, setFormData] = useState({
        employee_id: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    // Redirect jika sudah login
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // Bersihkan error saat unmount
    useEffect(() => {
        return () => { dispatch(clearError()); };
    }, [dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (authError) dispatch(clearError());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.employee_id || !formData.password) return;

        const result = await dispatch(loginUser({
            employee_id: formData.employee_id,
            password: formData.password,
        }));

        if (loginUser.fulfilled.match(result)) {
            navigate('/');
        }
    };

    const isFormValid = formData.employee_id.trim() && formData.password.trim();

    return (
        <div className="d-flex flex-column flex-lg-row flex-column-fluid">

            {/* ── Aside (panel kiri) ── */}
            <div
                className="d-flex flex-column flex-lg-row-auto w-xl-600px positon-xl-relative"
                style={{ backgroundColor: '#F2C98A' }}
            >
                <div className="d-flex flex-column position-xl-fixed top-0 bottom-0 w-xl-600px scroll-y">
                    <div className="d-flex flex-row-fluid flex-column text-center p-10 pt-lg-20">
                        <a href="/" className="py-9 mb-5">
                            <img
                                alt="Logo"
                                src="/metronic/media/logos/logo-2.svg"
                                className="h-60px"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </a>
                        <h1 className="fw-bolder fs-2qx pb-5 pb-md-10" style={{ color: '#986923' }}>
                            Welcome to Metronic
                        </h1>
                        <p className="fw-bold fs-2" style={{ color: '#986923' }}>
                            Discover Amazing Metronic<br />with great build tools
                        </p>
                    </div>
                    <div
                        className="d-flex flex-row-auto bgi-no-repeat bgi-position-x-center bgi-size-contain bgi-position-y-bottom min-h-100px min-h-lg-350px"
                        style={{ backgroundImage: `url(/metronic/media/illustrations/sketchy-1/13.png)` }}
                    />
                </div>
            </div>

            {/* ── Body (panel kanan) ── */}
            <div className="d-flex flex-column flex-lg-row-fluid py-10">
                <div className="d-flex flex-center flex-column flex-column-fluid">
                    <div className="w-lg-500px p-10 p-lg-15 mx-auto">

                        <form className="form w-100" noValidate onSubmit={handleSubmit}>

                            {/* Heading */}
                            <div className="text-center mb-10">
                                <h1 className="text-dark mb-3">Sign In</h1>
                                <div className="text-gray-400 fw-bold fs-4">
                                    Masuk menggunakan ID Karyawan Anda
                                </div>
                            </div>

                            {/* Error Alert */}
                            {authError && (
                                <div className="alert alert-danger d-flex align-items-center p-5 mb-10">
                                    <i className="bi bi-exclamation-triangle-fill fs-2 text-danger me-4 flex-shrink-0" />
                                    <div className="d-flex flex-column flex-grow-1">
                                        <h4 className="mb-1 text-danger">Login Gagal</h4>
                                        <span>{authError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-sm ms-auto"
                                        onClick={() => dispatch(clearError())}
                                    >
                                        <i className="bi bi-x fs-1 text-danger" />
                                    </button>
                                </div>
                            )}

                            {/* Employee ID */}
                            <div className="fv-row mb-10">
                                <label className="form-label fs-6 fw-bolder text-dark">
                                    Employee ID
                                </label>
                                <input
                                    className={`form-control form-control-lg form-control-solid ${authError ? 'is-invalid' : ''}`}
                                    type="text"
                                    name="employee_id"
                                    value={formData.employee_id}
                                    onChange={handleChange}
                                    autoComplete="username"
                                    placeholder="Contoh: EMP-001"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="fv-row mb-10">
                                <div className="d-flex flex-stack mb-2">
                                    <label className="form-label fw-bolder text-dark fs-6 mb-0">
                                        Password
                                    </label>
                                    <a href="/forgot-password" className="link-primary fs-6 fw-bolder">
                                        Forgot Password?
                                    </a>
                                </div>
                                <div className="position-relative">
                                    <input
                                        className={`form-control form-control-lg form-control-solid ${authError ? 'is-invalid' : ''}`}
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                        placeholder="Masukkan password"
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-icon position-absolute translate-middle-y top-50 end-0 me-n2"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} fs-4 text-muted`} />
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="text-center">
                                <button
                                    type="submit"
                                    className="btn btn-lg btn-primary w-100 mb-5"
                                    disabled={isLoading || !isFormValid}
                                >
                                    {isLoading ? (
                                        <span className="indicator-progress d-block">
                                            Mohon tunggu...{' '}
                                            <span className="spinner-border spinner-border-sm align-middle ms-2" />
                                        </span>
                                    ) : (
                                        <span className="indicator-label">Masuk</span>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="d-flex flex-center flex-wrap fs-6 p-5 pb-0">
                    <div className="d-flex flex-center fw-bold fs-6">
                        <a href="https://keenthemes.com" className="text-muted text-hover-primary px-2" target="_blank" rel="noreferrer">About</a>
                        <a href="https://devs.keenthemes.com" className="text-muted text-hover-primary px-2" target="_blank" rel="noreferrer">Support</a>
                        <a href="https://1.envato.market/EA4JP" className="text-muted text-hover-primary px-2" target="_blank" rel="noreferrer">Purchase</a>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LoginPage;