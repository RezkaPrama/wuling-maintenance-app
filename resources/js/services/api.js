import axios from 'axios'
import { store } from '../store/store'
import { clearAuth } from '../store/slices/authSlice'

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        // ✅ Gunakan key yang sama dengan authSlice
        const token = localStorage.getItem('sanctum_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // ✅ Dispatch Redux action, bukan window.location
            // Ini trigger PrivateRoute untuk redirect via React Router
            store.dispatch(clearAuth())
        }
        return Promise.reject(error)
    }
)

export default api