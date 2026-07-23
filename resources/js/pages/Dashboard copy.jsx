import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/maintenance-schedule/dashboard/summary')
        setSummary(res.data?.data ?? res.data)
      } catch (err) {
        if (err.response?.status !== 401) {
          setError('Gagal memuat data dashboard.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar py-5 py-lg-10" id="kt_toolbar">
        <div className="container-xxl d-flex flex-stack flex-wrap gap-2">
          <div className="page-title d-flex flex-column align-items-start me-3 py-2 py-lg-0 gap-2">
            <h1 className="d-flex text-dark fw-bold my-0 fs-3">Dashboard</h1>
            <ul className="breadcrumb breadcrumb-dot fw-semibold text-gray-600 fs-7">
              <li className="breadcrumb-item text-gray-600">
                <span className="text-muted">Wuling Maintenance System</span>
              </li>
              <li className="breadcrumb-item text-gray-500">Dashboard</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="row g-5 g-xl-10 mb-10">
            <StatCard
              title="Total Equipment"
              value={summary?.total_equipment ?? 0}
              color="primary"
              icon={<IconEquipment />}
              sub="Unit terdaftar"
            />
            <StatCard
              title="Jadwal Bulan Ini"
              value={summary?.schedule_this_month ?? 0}
              color="success"
              icon={<IconCalendar />}
              sub="Jadwal aktif"
            />
            <StatCard
              title="Perlu Perhatian"
              value={summary?.overdue ?? 0}
              color="danger"
              icon={<IconWarning />}
              sub="Overdue maintenance"
            />
            <StatCard
              title="Selesai Bulan Ini"
              value={summary?.completed_this_month ?? 0}
              color="info"
              icon={<IconCheck />}
              sub="Record selesai"
            />
          </div>

          {/* Recent Maintenance */}
          <div className="row g-5 g-xl-10">
            <div className="col-xl-8">
              <div className="card card-flush h-xl-100">
                <div className="card-header pt-7">
                  <h3 className="card-title align-items-start flex-column">
                    <span className="card-label fw-bold text-gray-800">Maintenance Terbaru</span>
                    <span className="text-gray-400 mt-1 fw-semibold fs-6">
                      Daftar record maintenance terakhir
                    </span>
                  </h3>
                  <div className="card-toolbar">
                    <button
                      className="btn btn-sm btn-light-primary"
                      onClick={() => navigate('/maintenance')}
                    >
                      Lihat Semua
                    </button>
                  </div>
                </div>
                <div className="card-body pt-3">
                  <RecentMaintenanceTable records={summary?.recent_records ?? []} />
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="col-xl-4">
              <div className="card card-flush h-xl-100">
                <div className="card-header pt-7">
                  <h3 className="card-title">
                    <span className="card-label fw-bold text-gray-800">Quick Access</span>
                  </h3>
                </div>
                <div className="card-body pt-3">
                  <div className="d-flex flex-column gap-3">
                    <button
                      className="btn btn-light-primary w-100 text-start"
                      onClick={() => navigate('/equipment')}
                    >
                      <i className="bi bi-tools me-2"></i>
                      Daftar Equipment
                    </button>
                    <button
                      className="btn btn-light-success w-100 text-start"
                      onClick={() => navigate('/maintenance')}
                    >
                      <i className="bi bi-clipboard-check me-2"></i>
                      Jadwal Maintenance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Sub Components ──────────────────────────────────────────

function StatCard({ title, value, color, icon, sub }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className={`card card-flush bg-light-${color} h-md-50px mb-5 mb-xl-10`}>
        <div className="card-header pt-5">
          <div className="card-title d-flex flex-column">
            <span className={`fs-2hx fw-bold text-${color} me-2 lh-1 ls-n2`}>
              {value}
            </span>
            <span className="text-gray-500 pt-1 fw-semibold fs-6">{title}</span>
          </div>
        </div>
        <div className="card-footer d-flex align-items-center pt-0">
          <span className={`svg-icon svg-icon-2 svg-icon-${color} me-3`}>
            {icon}
          </span>
          <span className="text-gray-500 fw-semibold fs-6 flex-grow-1">{sub}</span>
        </div>
      </div>
    </div>
  )
}

function RecentMaintenanceTable({ records }) {
  if (!records.length) {
    return (
      <div className="text-center text-muted py-10">
        <i className="bi bi-inbox fs-2x d-block mb-3"></i>
        Belum ada data maintenance
      </div>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle table-row-dashed fs-6 gy-4">
        <thead>
          <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0">
            <th>Equipment</th>
            <th>Tanggal</th>
            <th>Status</th>
            <th>Teknisi</th>
          </tr>
        </thead>
        <tbody className="fw-semibold text-gray-600">
          {records.map((rec, i) => (
            <tr key={rec.id ?? i}>
              <td>{rec.equipment_name ?? rec.equipment?.name ?? '-'}</td>
              <td>{rec.date ?? rec.scheduled_date ?? '-'}</td>
              <td><StatusBadge status={rec.status} /></td>
              <td>{rec.technician ?? rec.user?.name ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed:   { label: 'Selesai',  cls: 'success' },
    in_progress: { label: 'Berjalan', cls: 'warning' },
    pending:     { label: 'Pending',  cls: 'danger'  },
    scheduled:   { label: 'Terjadwal', cls: 'primary' },
  }
  const s = map[status] ?? { label: status ?? '-', cls: 'secondary' }
  return <span className={`badge badge-light-${s.cls}`}>{s.label}</span>
}

function LoadingSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center py-20">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}

function ErrorAlert({ message }) {
  return (
    <div className="alert alert-danger d-flex align-items-center p-5">
      <i className="bi bi-exclamation-triangle fs-2 me-3"></i>
      <div>{message}</div>
    </div>
  )
}

// ── Icons ───────────────────────────────────────────────────

function IconEquipment() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M4.05424 15.1982C8.34524 7.76818 13.5782 3.26318 20.9282 2.01418C21.0729 1.98837 21.2216 1.99789 21.3618 2.04193C21.502 2.08597 21.6294 2.16323 21.7333 2.26712C21.8372 2.37101 21.9144 2.49846 21.9585 2.63863C22.0025 2.7788 22.012 2.92754 21.9862 3.07218C20.7372 10.4222 16.2322 15.6552 8.80224 19.9462L4.05424 15.1982Z" fill="currentColor"/>
      <path d="M4.05423 15.1982L2.24723 13.3912C2.15505 13.299 2.08547 13.1867 2.04395 13.0632C2.00243 12.9396 1.9901 12.8081 2.00793 12.679C2.02575 12.5498 2.07325 12.4266 2.14669 12.3189C2.22013 12.2112 2.31752 12.1219 2.43123 12.0582L9.15323 8.28918C7.17353 10.3717 5.4607 12.6926 4.05423 15.1982Z" fill="currentColor"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M21 22H3C2.4 22 2 21.6 2 21V5C2 4.4 2.4 4 3 4H21C21.6 4 22 4.4 22 5V21C22 21.6 21.6 22 21 22Z" fill="currentColor"/>
      <path d="M6 6C5.4 6 5 5.6 5 5V3C5 2.4 5.4 2 6 2C6.6 2 7 2.4 7 3V5C7 5.6 6.6 6 6 6ZM11 5V3C11 2.4 10.6 2 10 2C9.4 2 9 2.4 9 3V5C9 5.6 9.4 6 10 6C10.6 6 11 5.6 11 5ZM15 5V3C15 2.4 14.6 2 14 2C13.4 2 13 2.4 13 3V5C13 5.6 13.4 6 14 6C14.6 6 15 5.6 15 5ZM19 5V3C19 2.4 18.6 2 18 2C17.4 2 17 2.4 17 3V5C17 5.6 17.4 6 18 6C18.6 6 19 5.6 19 5Z" fill="currentColor"/>
    </svg>
  )
}

function IconWarning() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect opacity="0.3" x="2" y="2" width="20" height="20" rx="10" fill="currentColor"/>
      <rect x="11" y="14" width="7" height="2" rx="1" transform="rotate(-90 11 14)" fill="currentColor"/>
      <rect x="11" y="17" width="2" height="2" rx="1" transform="rotate(-90 11 17)" fill="currentColor"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect opacity="0.3" x="2" y="2" width="20" height="20" rx="10" fill="currentColor"/>
      <path d="M10.4343 12.4343L8.75 10.75C8.33579 10.3358 7.66421 10.3358 7.25 10.75C6.83579 11.1642 6.83579 11.8358 7.25 12.25L10.2929 15.2929C10.6834 15.6834 11.3166 15.6834 11.7071 15.2929L17.25 9.75C17.6642 9.33579 17.6642 8.66421 17.25 8.25C16.8358 7.83579 16.1642 7.83579 15.75 8.25L11.5657 12.4343C11.2533 12.7467 10.7467 12.7467 10.4343 12.4343Z" fill="currentColor"/>
    </svg>
  )
}