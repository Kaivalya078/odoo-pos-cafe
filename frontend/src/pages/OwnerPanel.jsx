import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRestaurant } from '../context/RestaurantContext';
import { getAllUsers, createUser, updateUserRole, updateUpi, getUpi } from '../services/userService';
import { Users, UserPlus, Crown, Smartphone, CheckCircle, Edit3, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const VALID_ROLES = ['OWNER', 'ADMIN', 'KITCHEN', 'CASHIER'];

export default function OwnerPanel() {
  const { user: currentUser } = useAuth();
  const { status, lastSession, toggleStatus } = useRestaurant();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Create-user form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('CASHIER');
  const [creating, setCreating] = useState(false);

  // UPI settings
  const [upiInput, setUpiInput] = useState('');
  const [savedUpi, setSavedUpi] = useState(null);
  const [savingUpi, setSavingUpi] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const pollRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    // Poll every 10 s — reflect role changes and new users in real-time
    pollRef.current = setInterval(fetchUsers, 10_000);
    // Fetch current UPI ID from backend
    getUpi().then((res) => {
      const id = res.data?.data?.upiId;
      if (id) { setUpiInput(id); setSavedUpi(id); }
    }).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, [fetchUsers]);

  // --- Restaurant toggle ---
  const handleToggle = async () => {
    setToggling(true);
    try {
      const data = await toggleStatus();
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  // --- Create user ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser({
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
      });
      toast.success('User created successfully');
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormRole('CASHIER');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // --- Update role ---
  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success('Role updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  // --- Save UPI ID ---
  const handleSaveUpi = async (e) => {
    e.preventDefault();
    if (!upiInput.trim()) { toast.error('Please enter a UPI ID'); return; }
    setSavingUpi(true);
    try {
      await updateUpi(upiInput.trim());
      setSavedUpi(upiInput.trim());
      setEditingUpi(false);
      toast.success('UPI ID saved! QR payments are now enabled for cashiers.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Owner Panel</h1>
        <p className="page-subtitle">Manage users and restaurant state</p>
      </div>

      {/* Restaurant Status */}
      <div className="card">
        <div className="card-title">
          <Crown size={16} />
          Restaurant Status
        </div>
        <div className="status-row">
          <div className="status-info">
            <span className="status-label">Current state:</span>
            <span className={`status-badge status-badge--${status === 'OPEN' ? 'open' : 'closed'}`}>
              <span className="status-dot" />
              {status || '…'}
            </span>
          </div>
          <button
            className={`btn-toggle btn-toggle--${status === 'OPEN' ? 'open' : 'closed'}`}
            onClick={handleToggle}
            disabled={toggling}
            id="owner-toggle-status"
          >
            {toggling ? 'Updating…' : status === 'OPEN' ? 'Close Restaurant' : 'Open Restaurant'}
          </button>
        </div>
        {status === 'CLOSED' && lastSession && lastSession.lastClosedAt && (
          <div className="last-session-summary">
            <div className="last-session-title">Last Session Summary</div>
            <div className="last-session-grid">
              <div className="last-session-item">
                <div className="last-session-label">🟢 Opened</div>
                <div className="last-session-value">
                  {lastSession.lastOpenedAt
                    ? new Date(lastSession.lastOpenedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—'}
                </div>
              </div>
              <div className="last-session-item">
                <div className="last-session-label">🔴 Closed</div>
                <div className="last-session-value">
                  {new Date(lastSession.lastClosedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>
              <div className="last-session-item last-session-item--highlight">
                <div className="last-session-label">💰 Revenue</div>
                <div className="last-session-value last-session-revenue">₹{(lastSession.totalRevenue || 0).toFixed(2)}</div>
              </div>
              <div className="last-session-item">
                <div className="last-session-label">📦 Orders</div>
                <div className="last-session-value">{lastSession.totalOrders ?? 0} paid orders</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPI Payment Settings — redesigned */}
      <div className="card upi-card">
        <div className="card-title"><Smartphone size={16} />UPI Payment Settings</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', marginTop: -4 }}>
          Set your UPI ID so cashiers can generate QR codes for customer payments.
        </p>

        {savedUpi && !editingUpi ? (
          /* ── Saved state: show the ID with an edit button ── */
          <div className="upi-saved-state">
            <div className="upi-saved-left">
              <div className="upi-saved-icon"><QrCode size={20} /></div>
              <div>
                <div className="upi-saved-label">Active UPI ID</div>
                <div className="upi-saved-id">{savedUpi}</div>
              </div>
            </div>
            <div className="upi-saved-actions">
              <span className="upi-active-badge"><CheckCircle size={12} />Active</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingUpi(true)}
                id="edit-upi-btn"
              >
                <Edit3 size={13} />Change UPI
              </button>
            </div>
          </div>
        ) : (
          /* ── Edit/Add state ── */
          <form onSubmit={handleSaveUpi} className="upi-edit-form">
            <div className="upi-input-wrap">
              <Smartphone size={15} className="upi-input-icon" />
              <input
                id="upi-id-input"
                className="form-input upi-input"
                type="text"
                placeholder="e.g. yourname@upi or 9876543210@paytm"
                value={upiInput}
                onChange={(e) => setUpiInput(e.target.value)}
              />
            </div>
            <div className="upi-form-actions">
              {savedUpi && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setUpiInput(savedUpi); setEditingUpi(false); }}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={savingUpi} id="save-upi-btn">
                {savingUpi ? 'Saving…' : savedUpi ? 'Update UPI' : 'Save UPI'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat-item">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        {VALID_ROLES.map((role) => (
          <div className="stat-item" key={role}>
            <div className="stat-value">{users.filter((u) => u.role === role).length}</div>
            <div className="stat-label">{role}</div>
          </div>
        ))}
      </div>

      {/* Create User */}
      <div className="card">
        <div className="card-title">
          <UserPlus size={16} />
          Create User
        </div>
        <form onSubmit={handleCreateUser}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="create-name">Name</label>
              <input
                id="create-name"
                className="form-input"
                type="text"
                placeholder="Full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="create-email">Email</label>
              <input
                id="create-email"
                className="form-input"
                type="email"
                placeholder="user@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="create-password">Password</label>
              <input
                id="create-password"
                className="form-input"
                type="password"
                placeholder="Min 6 characters"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="create-role">Role</label>
              <select
                id="create-role"
                className="form-select"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              >
                {VALID_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
            id="create-user-submit"
          >
            {creating ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="card">
        <div className="card-title">
          <Users size={16} />
          All Users
        </div>
        {loadingUsers ? (
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`role-tag role-tag--${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      {u._id === currentUser.id ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        <select
                          className="table-role-select"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          {VALID_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
