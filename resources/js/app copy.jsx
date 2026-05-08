import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store'
import AppRoutes from './routes/AppRoutes'
import './index.css'

// Reinit Metronic setiap route berubah
function MetronicInit() {
  const location = useLocation()
  useEffect(() => {
    if (window.KTComponents) window.KTComponents.init()
  }, [location])
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <MetronicInit />
      <AppRoutes />
    </BrowserRouter>
  </Provider>
)