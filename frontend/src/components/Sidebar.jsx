import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Settings,
  ChefHat,
  CreditCard,
  LogOut,
  UtensilsCrossed,
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

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = ROLE_NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">POS Cafe</div>
        <div className="sidebar-role">{user?.name} · {user?.role}</div>
      </div>

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
            <link.icon />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout} id="logout-btn">
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
