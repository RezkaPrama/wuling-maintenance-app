import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import equipmentReducer from '../features/equipment/equipmentSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        equipment: equipmentReducer,
        // tambahkan reducer modul lain di sini: schedule, record, checkSheetTemplate, dst
    },
});

export default store;