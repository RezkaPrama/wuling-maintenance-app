import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  // Reinit KTComponents setiap navigasi (agar dropdown, menu Metronic tetap jalan)
  useEffect(() => {
    if (window.KTComponents) window.KTComponents.init()
  }, [])

  return (
    <div className="d-flex flex-column flex-root">
			<div className="page d-flex flex-row flex-column-fluid">

        <Sidebar />

        <div className="wrapper d-flex flex-column flex-row-fluid" id="kt_wrapper">
          <Navbar />

          {/* Konten halaman aktif */}
          <div className="content d-flex flex-column flex-column-fluid" id="kt_content">
            <div className="post d-flex flex-column-fluid" id="kt_post">
              <div id="kt_content_container" className="container-xxl">
                {children}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer py-4 d-flex flex-lg-column shadow-sm" id="kt_footer">
            <div className="container-fluid d-flex flex-column flex-md-row align-items-center justify-content-between">
              <div className="text-dark order-2 order-md-1">
                <span className="text-muted fw-bold me-1">2026©</span>
                <a href="https://wuling.com" target="_blank" className="text-gray-800 text-hover-primary">Wuling Maintenance</a>
              </div>
              <ul className="menu menu-gray-600 menu-hover-primary fw-bold order-1">
                <li className="menu-item">
                  <a href="https://drive.google.com/file/d/1U1EdyHZdnsEs9E8dwH2ftKaHO-Sb5maG/view?usp=drive_link" target="_blank" className="menu-link px-2">Download Mobile Apps CBB</a>
                </li>
            </ul>
          </div>
        </div>
      </div>

    </div>
    </div >
  )
}