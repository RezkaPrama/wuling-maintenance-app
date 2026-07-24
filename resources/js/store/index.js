import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import equipmentReducer from '../features/equipment/equipmentSlice';
import checksheetReducer from '../features/checksheet/checkSheetSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        equipment: equipmentReducer,
        checksheet: checksheetReducer,
        // tambahkan reducer modul lain di sini: schedule, record, checkSheetTemplate, dst
    },
});

export default store;