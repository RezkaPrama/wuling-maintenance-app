import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearCredentials, selectUser } from '../store/slices/authSlice'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Sidebar() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(selectUser)

  const handleLogout = async () => {
    try {
      await api.post('/logout')
    } catch (e) {}
    dispatch(clearCredentials())
    navigate('/login')
  }

  return (
    <div id="kt_aside" className="aside aside-dark aside-hoverable"
      data-kt-drawer="true"
      data-kt-drawer-name="aside"
      data-kt-drawer-activate="{default: true, lg: false}"
      data-kt-drawer-overlay="true"
      data-kt-drawer-width="{default:'200px', '300px': '250px'}"
      data-kt-drawer-direction="start"
      data-kt-drawer-toggle="#kt_aside_mobile_toggle">

      {/* Logo */}
      <div className="aside-logo flex-column-auto" id="kt_aside_logo">
        <NavLink to="/">
          <span className="text-white fw-bolder fs-3">Wuling</span>
        </NavLink>
        <div id="kt_aside_toggle"
          className="btn btn-icon w-auto px-0 btn-active-color-primary aside-toggle"
          data-kt-toggle="true"
          data-kt-toggle-state="active"
          data-kt-toggle-target="body"
          data-kt-toggle-name="aside-minimize">
          <span className="svg-icon svg-icon-1 rotate-180">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path opacity="0.5" d="M14.2657 11.4343L18.45 7.25C18.8642 6.83579 18.8642 6.16421 18.45 5.75C18.0358 5.33579 17.3642 5.33579 16.95 5.75L11.4071 11.2929C11.0166 11.6834 11.0166 12.3166 11.4071 12.7071L16.95 18.25C17.3642 18.6642 18.0358 18.6642 18.45 18.25C18.8642 17.8358 18.8642 17.1642 18.45 16.75L14.2657 12.5657C13.9533 12.2533 13.9533 11.7467 14.2657 11.4343Z" fill="currentColor"/>
              <path d="M8.2657 11.4343L12.45 7.25C12.8642 6.83579 12.8642 6.16421 12.45 5.75C12.0358 5.33579 11.3642 5.33579 10.95 5.75L5.40712 11.2929C5.01659 11.6834 5.01659 12.3166 5.40712 12.7071L10.95 18.25C11.3642 18.6642 12.0358 18.6642 12.45 18.25C12.8642 17.8358 12.8642 17.1642 12.45 16.75L8.2657 12.5657C7.95328 12.2533 7.95328 11.7467 8.2657 11.4343Z" fill="currentColor"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="aside-menu flex-column-fluid">
        <div className="hover-scroll-overlay-y my-5 my-lg-5"
          id="kt_aside_menu_wrapper"
          data-kt-scroll="true"
          data-kt-scroll-activate="{default: false, lg: true}"
          data-kt-scroll-height="auto"
          data-kt-scroll-dependencies="#kt_aside_logo, #kt_aside_footer"
          data-kt-scroll-wrappers="#kt_aside_menu"
          data-kt-scroll-offset="0">

          <div className="menu menu-column menu-title-gray-800 menu-state-title-primary menu-state-icon-primary menu-state-bullet-primary menu-arrow-gray-500"
            id="#kt_aside_menu"
            data-kt-menu="true"
            data-kt-menu-expand="false">

            {/* Dashboard */}
            <div className="menu-item">
              <NavLink to="/" className={({ isActive }) =>
                `menu-link ${isActive ? 'active' : ''}`
              }>
                <span className="menu-icon">
                  <span className="svg-icon svg-icon-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor"/>
                      <rect opacity="0.3" x="13" y="2" width="9" height="9" rx="2" fill="currentColor"/>
                      <rect opacity="0.3" x="13" y="13" width="9" height="9" rx="2" fill="currentColor"/>
                      <rect opacity="0.3" x="2" y="13" width="9" height="9" rx="2" fill="currentColor"/>
                    </svg>
                  </span>
                </span>
                <span className="menu-title">Dashboard</span>
              </NavLink>
            </div>

            {/* Section: Apps */}
            <div className="menu-item">
              <div className="menu-content pt-8 pb-2">
                <span className="menu-section text-muted text-uppercase fs-8 ls-1">Maintenance</span>
              </div>
            </div>

            {/* Equipment */}
            <div className="menu-item">
              <NavLink to="/equipment" className={({ isActive }) =>
                `menu-link ${isActive ? 'active' : ''}`
              }>
                <span className="menu-icon">
                  <span className="svg-icon svg-icon-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path opacity="0.3" d="M4.05424 15.1982C8.34524 7.76818 13.5782 3.26318 20.9282 2.01418C21.0729 1.98837 21.2216 1.99789 21.3618 2.04193C21.502 2.08597 21.6294 2.16323 21.7333 2.26712C21.8372 2.37101 21.9144 2.49846 21.9585 2.63863C22.0025 2.7788 22.012 2.92754 21.9862 3.07218C20.7372 10.4222 16.2322 15.6552 8.80224 19.9462L4.05424 15.1982Z" fill="currentColor"/>
                      <path d="M4.05423 15.1982L2.24723 13.3912C2.15505 13.299 2.08547 13.1867 2.04395 13.0632C2.00243 12.9396 1.9901 12.8081 2.00793 12.679C2.02575 12.5498 2.07325 12.4266 2.14669 12.3189C2.22013 12.2112 2.31752 12.1219 2.43123 12.0582L9.15323 8.28918C7.17353 10.3717 5.4607 12.6926 4.05423 15.1982Z" fill="currentColor"/>
                    </svg>
                  </span>
                </span>
                <span className="menu-title">Equipment</span>
              </NavLink>
            </div>

            {/* Maintenance */}
            <div className="menu-item">
              <NavLink to="/maintenance" className={({ isActive }) =>
                `menu-link ${isActive ? 'active' : ''}`
              }>
                <span className="menu-icon">
                  <span className="svg-icon svg-icon-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path opacity="0.3" d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="currentColor"/>
                      <path d="M20 8L14 2V6C14 7.10457 14.8954 8 16 8H20Z" fill="currentColor"/>
                    </svg>
                  </span>
                </span>
                <span className="menu-title">Maintenance</span>
              </NavLink>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Sidebar — User + Logout */}
      <div className="aside-footer flex-column-auto pt-5 pb-7 px-5" id="kt_aside_footer">
        <div className="d-flex align-items-center mb-3">
          <div className="d-flex flex-column">
            <span className="text-white fw-bold fs-7">{user?.name ?? 'User'}</span>
            <span className="text-white opacity-50 fs-8">{user?.email ?? ''}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-custom btn-danger w-100 btn-sm">
          Sign Out
        </button>
      </div>

    </div>
  )
}