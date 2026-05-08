import React, { useEffect, useRef, useState } from 'react';

/**
 * StatCard — kartu statistik dengan animasi counter
 *
 * Props:
 * - title      : string  — label kartu
 * - value      : number  — angka yang ditampilkan
 * - icon       : string  — class Bootstrap Icons (contoh: 'bi-exclamation-circle')
 * - colorClass : string  — Metronic color class (danger, warning, success, primary, info)
 * - loading    : boolean — tampilkan skeleton
 * - description: string  — teks kecil di bawah angka (opsional)
 */
const StatCard = ({ title, value = 0, icon, colorClass = 'primary', loading = false, description }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const animRef = useRef(null);

    // Animasi counter saat value berubah
    useEffect(() => {
        if (loading) return;
        if (animRef.current) cancelAnimationFrame(animRef.current);

        const duration = 800;
        const start    = performance.now();
        const from     = displayValue;
        const to       = value;

        const animate = (now) => {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(from + (to - from) * eased));
            if (progress < 1) animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [value, loading]);

    if (loading) {
        return (
            <div className="col-sm-6 col-xl-4">
                <div className="card h-100">
                    <div className="card-body p-7">
                        <div className="placeholder-glow">
                            <span className="placeholder col-4 rounded mb-4 d-block" style={{ height: '48px' }} />
                            <span className="placeholder col-8 rounded mb-2 d-block" style={{ height: '16px' }} />
                            <span className="placeholder col-6 rounded d-block" style={{ height: '14px' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="col-sm-6 col-xl-4">
            <div className={`card h-100 border-0 shadow-sm`}
                 style={{ borderLeft: `4px solid var(--bs-${colorClass}) !important` }}>
                <div className="card-body p-7">
                    {/* Icon + Value */}
                    <div className="d-flex align-items-center mb-3">
                        <div className={`symbol symbol-50px me-4`}>
                            <div className={`symbol-label bg-light-${colorClass}`}>
                                <i className={`bi ${icon} fs-2x text-${colorClass}`} />
                            </div>
                        </div>
                        <div>
                            <span className={`fs-2hx fw-bold text-${colorClass} lh-1`}>
                                {displayValue}
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="fw-semibold fs-6 text-gray-700">{title}</div>

                    {/* Description */}
                    {description && (
                        <div className="text-muted fs-7 mt-1">{description}</div>
                    )}
                </div>

                {/* Color bar bawah */}
                <div className={`card-footer border-0 py-2 bg-light-${colorClass}`}>
                    <span className={`text-${colorClass} fs-8 fw-bold`}>
                        <i className="bi bi-arrow-right me-1" />
                        Lihat detail
                    </span>
                </div>
            </div>
        </div>
    );
};

export default StatCard;