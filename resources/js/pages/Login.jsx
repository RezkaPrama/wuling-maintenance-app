import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../store/slices/authSlice'
import api from '../services/api'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/login', { email, password })
      const { token, user } = res.data

      dispatch(setCredentials({ token, user }))
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Email atau password salah!'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex flex-column flex-root">
      <div className="d-flex flex-column flex-lg-row flex-column-fluid">

        {/* Sisi kiri — background */}
        <div className="d-flex flex-lg-row-fluid w-lg-50 bgi-size-cover bgi-position-center order-1 order-lg-2"
          style={{ backgroundColor: '#1e1e2d' }}>
          <div className="d-flex flex-column flex-center py-15 px-5 px-md-15 w-100">
            <h1 className="text-white fs-2qx fw-bolder text-center mb-7">
              Wuling Maintenance System
            </h1>
            <p className="text-white opacity-75 fs-base text-center">
              Sistem manajemen perawatan kendaraan Wuling
            </p>
          </div>
        </div>

        {/* Sisi kanan — form */}
        <div className="d-flex flex-column flex-lg-row-fluid w-lg-50 p-10 order-2 order-lg-1">
          <div className="d-flex flex-center flex-column flex-lg-row-fluid">
            <div className="w-lg-500px p-10">

              <form onSubmit={handleLogin} className="form w-100">

                {/* Heading */}
                <div className="text-center mb-11">
                  <h1 className="text-dark fw-bolder mb-3">Sign In</h1>
                  <div className="text-gray-500 fw-semibold fs-6">
                    Masuk ke akun Anda
                  </div>
                </div>

                {/* Error alert */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center p-5 mb-10">
                    <span className="svg-icon svg-icon-2hx svg-icon-danger me-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path opacity="0.3" d="M20.5543 4.37824L12.1798 2.02473C12.0626 1.99176 11.9376 1.99176 11.8203 2.02473L3.44572 4.37824C3.18118 4.45258 3 4.6807 3 4.93945V13.569C3 14.6914 3.48509 15.8404 4.4417 16.984C5.17231 17.8575 6.18314 18.7345 7.446 19.5909C9.56752 21.0295 11.6566 21.912 11.7445 21.9488C11.8258 21.9829 11.9129 22 12.0001 22C12.0872 22 12.1744 21.983 12.2557 21.9488C12.3435 21.912 14.4326 21.0295 16.5541 19.5909C17.8169 18.7345 18.8277 17.8575 19.5584 16.984C20.515 15.8404 21 14.6914 21 13.569V4.93945C21 4.6807 20.8189 4.45258 20.5543 4.37824Z" fill="currentColor"/>
                      </svg>
                    </span>
                    <div className="d-flex flex-column">
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="fv-row mb-8">
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="off"
                    className="form-control bg-transparent"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div className="fv-row mb-3">
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="off"
                    className="form-control bg-transparent"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Submit */}
                <div className="d-grid mb-10 mt-8">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"/>
                        Mohon tunggu...
                      </>
                    ) : 'Sign In'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}