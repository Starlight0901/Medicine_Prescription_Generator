import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS, ROUTES } from '../data/constants';
import { NAV_ICON_KEYS, NAV_ICONS } from './NavIcons';

const MOBILE_LABELS = {
  Dashboard: 'Home',
  'New Prescription': 'New Rx',
};

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" aria-hidden="true">
            {NAV_ICONS.brand}
          </div>
          <span className="sidebar-brand-text">Doctor<br />Prescriptions</span>
        </div>

        <ul className="sidebar-nav">
          {NAV_ITEMS.map(({ label, path }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="sidebar-nav-icon">
                  {NAV_ICONS[NAV_ICON_KEYS[path]]}
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-label">Signed in as</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <ul className="bottom-nav-list">
          {NAV_ITEMS.map(({ label, path }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `bottom-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="bottom-nav-icon">
                  {NAV_ICONS[NAV_ICON_KEYS[path]]}
                </span>
                <span className="bottom-nav-label">
                  {MOBILE_LABELS[label] ?? label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export default Navbar;
