import { createSlice } from '@reduxjs/toolkit'

// Ambil data dari localStorage saat app pertama load
const initialState = {
    token: localStorage.getItem('token') ?? null,
    user:  JSON.parse(localStorage.getItem('user') ?? 'null'),
    isAuthenticated: !!localStorage.getItem('token'),
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Dipanggil saat login berhasil
        setCredentials: (state, action) => {
            const { token, user } = action.payload
            state.token           = token
            state.user            = user
            state.isAuthenticated = true

            // Simpan ke localStorage agar tidak hilang saat refresh
            localStorage.setItem('token', token)
            localStorage.setItem('user', JSON.stringify(user))
        },

        // Dipanggil saat logout
        clearCredentials: (state) => {
            state.token           = null
            state.user            = null
            state.isAuthenticated = false

            localStorage.removeItem('token')
            localStorage.removeItem('user')
        },
    },
})

export const { setCredentials, clearCredentials } = authSlice.actions

// Selector — untuk ambil data di komponen React
export const selectToken           = (state) => state.auth.token
export const selectUser            = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated

export default authSlice.reducer