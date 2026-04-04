import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Settings,
  ChefHat,
  CreditCard,
  LogOut,
  UtensilsCrossed,
  Coffee,
} from 'lucide-react';

const ROLE_NAV = {
  OWNER: [
    { to: '/owner', label: 'Owner Panel', icon: LayoutDashboard },
    { to: '/admin', label: 'Admin Panel', icon: Settings },
    { to: '/kitchen', label: 'Kitchen', icon: ChefHat },
    { to: '/cashier', label: 'Cashier', icon: CreditCard },
    { to: '/tables', label: 'Orders', icon: UtensilsCrossed },
  ],
  ADMIN: [
    { to: '/admin', label: 'Admin Panel', icon: Settings },
    { to: '/cashier', label: 'Cashier', icon: CreditCard },
    { to: '/tables', label: 'Orders', icon: UtensilsCrossed },
  ],
  KITCHEN: [
    { to: '/kitchen', label: 'Kitchen', icon: ChefHat },
  ],
  CASHIER: [
    { to: '/cashier', label: 'Cashier', icon: CreditCard },
  ],
};

const ROLE_COLOR = {
  OWNER:   { color: 'var(--role-owner)',   bg: 'var(--role-owner-bg)' },
  ADMIN:   { color: 'var(--role-admin)',   bg: 'var(--role-admin-bg)' },
  KITCHEN: { color: 'var(--role-kitchen)', bg: 'var(--role-kitchen-bg)' },
  CASHIER: { color: 'var(--role-cashier)', bg: 'var(--role-cashier-bg)' },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = ROLE_NAV[user?.role] || [];
  const roleStyle = ROLE_COLOR[user?.role] || {};

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Coffee size={18} />
          </div>
          <span className="sidebar-brand-name">POS Cafe</span>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user?.name}</div>
          <span
            className="sidebar-role-badge"
            style={{ color: roleStyle.color, background: roleStyle.bg }}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <link.icon size={17} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout} id="logout-btn">
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
