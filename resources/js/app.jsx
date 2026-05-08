import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Provider, useDispatch } from 'react-redux'
import store from './store/store'          // ✅ default import, hapus kurung kurawal
import AppRoutes from './routes/AppRoutes'
import { fetchCurrentUser } from './store/slices/authSlice' // ✅ pastikan import action creator untuk restore session
import axios from 'axios'
import './index.css'

// Setup axios global
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
}

// Auto redirect ke /login kalau token expired (401)
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('sanctum_token')
            delete axios.defaults.headers.common['Authorization']
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// Reinit Metronic + restore session setiap route berubah
function AppInner() {
    const location = useLocation()
    const dispatch = useDispatch()

    // Restore session saat pertama load
    useEffect(() => {
        const token = localStorage.getItem('sanctum_token')
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            dispatch(fetchCurrentUser())
        }
    }, []) // hanya sekali saat mount

    // Reinit Metronic setiap pindah halaman
    useEffect(() => {
        if (window.KTComponents) window.KTComponents.init()
    }, [location])

    return null
}

const rootElement = document.getElementById('root')

if (rootElement && !rootElement._reactRootContainer) {
    ReactDOM.createRoot(rootElement).render(
        <Provider store={store}>
            <BrowserRouter>
                <AppInner />
                <AppRoutes />
            </BrowserRouter>
        </Provider>
    )
}