import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Provider, useDispatch, useSelector } from 'react-redux'
import store from './store/store'
import AppRoutes from './routes/AppRoutes'
import { fetchCurrentUser, selectCurrentUser } from './store/slices/authSlice'
import axios from 'axios'
import './index.css'

axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
}

// ✅ Helper — tutup aside drawer via semua cara yang tersedia
function closeAsideDrawer() {
    const body    = document.body
    const aside   = document.querySelector('#kt_aside')
    const overlay = document.querySelector('.drawer-overlay')

    // Cara 1: pakai KTDrawer instance
    if (aside && window.KTDrawer) {
        try {
            const instance = window.KTDrawer.getInstance(aside)
            if (instance) {
                instance.hide()
                return
            }
        } catch (_) {}
    }

    // Cara 2: manipulasi class langsung (fallback paling reliable)
    if (aside) {
        aside.classList.remove('drawer-on')
    }
    if (overlay) {
        overlay.remove()
    }
    // Hapus class drawer-on dari body kalau ada
    body.classList.remove('drawer-on')
    // Kembalikan overflow body
    body.style.overflow = ''
}

function AppInner() {
    const location = useLocation()
    const dispatch = useDispatch()
    const user     = useSelector(selectCurrentUser)

    // Restore session sekali saat mount
    useEffect(() => {
        const savedToken = localStorage.getItem('sanctum_token')
        if (savedToken && !user) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
            dispatch(fetchCurrentUser())
        }
    }, [])

    // Setiap navigasi: tutup drawer DULU, baru reinit Metronic
    useEffect(() => {
        // 1. Tutup drawer mobile
        closeAsideDrawer()

        // 2. Reinit Metronic (pakai setTimeout agar DOM sudah render)
        const timer = setTimeout(() => {
            if (window.KTComponents) window.KTComponents.init()
        }, 100)

        return () => clearTimeout(timer)
    }, [location.pathname]) // ← pakai pathname, bukan seluruh object location

    return null
}

const container = document.getElementById('root')

if (!container._reactRoot) {
    container._reactRoot = ReactDOM.createRoot(container)
}

container._reactRoot.render(
    <Provider store={store}>
        <BrowserRouter>
            <AppInner />
            <AppRoutes />
        </BrowserRouter>
    </Provider>
)