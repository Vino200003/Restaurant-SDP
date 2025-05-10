import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';
import logo from '../assets/logo.png';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
    console.log('User logged out');
  };

  const isRouteActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Restaurant Logo" className="sidebar-logo" />
        <h3 className="sidebar-title">Restaurant Admin</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/dashboard" className={`nav-link ${isRouteActive('/dashboard') ? 'active' : ''}`}>
              <span className="icon">📊</span>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/menu-management" className={`nav-link ${isRouteActive('/menu-management') ? 'active' : ''}`}>
              <span className="icon">🍽️</span>
              Menu Management
            </Link>
          </li>
          <li>
            <Link to="/orders" className={`nav-link ${isRouteActive('/orders') ? 'active' : ''}`}>
              <span className="icon">🛒</span>
              Orders
            </Link>
          </li>
          
          <li>
            <Link to="/reservations" className={`nav-link ${isRouteActive('/reservations') ? 'active' : ''}`}>
              <span className="icon">📅</span>
              Table Reservations
            </Link>
          </li>
          <li>
            <Link to="/inventory" className={`nav-link ${isRouteActive('/inventory') ? 'active' : ''}`}>
              <span className="icon">📦</span>
              Inventory
            </Link>
          </li>
          <li>
            <Link to="/staff" className={`nav-link ${isRouteActive('/staff') ? 'active' : ''}`}>
              <span className="icon">👥</span>
              Staff Management
            </Link>
          </li>
          <li>
            <Link to="/attendance" className={`nav-link ${isRouteActive('/attendance') ? 'active' : ''}`}>
              <span className="icon">⏱️</span>
              Attendance
            </Link>
          </li>
          <li>
            <Link to="/delivery-management" className={`nav-link ${isRouteActive('/staff') ? 'active' : ''}`}>
              <span className="icon">🚚</span>
              Delivery Management
            </Link>
          </li>
          
          <li>
            <Link to="/settings" className={`nav-link ${isRouteActive('/settings') ? 'active' : ''}`}>
              <span className="icon">⚙️</span>
              Admin Settings
            </Link>
          </li>
          <li>
            <Link to="/reports" className={`nav-link ${isRouteActive('/reports') ? 'active' : ''}`}>
              <span className="icon">📈</span>
              Reports
            </Link>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          <span className="icon">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
