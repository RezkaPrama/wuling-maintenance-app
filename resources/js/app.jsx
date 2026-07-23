import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useDispatch } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './store';
import { logout } from './features/auth/authSlice';
import AppRoutes from './routes/AppRoutes';

// Dengar event 'auth:unauthorized' yang di-broadcast axiosInstance.js saat 401,
// lalu dispatch logout ke Redux dari sini (bukan dari axiosInstance langsung,
// supaya tidak circular import — lihat komentar di lib/axiosInstance.js).
function AuthEventListener() {
    const dispatch = useDispatch();
    useEffect(() => {
        const handler = () => dispatch(logout());
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, [dispatch]);
    return null;
}

function App() {
    return (
        <BrowserRouter>
            <AuthEventListener />
            <AppRoutes />
        </BrowserRouter>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Provider store={store}>
        <App />
    </Provider>
);