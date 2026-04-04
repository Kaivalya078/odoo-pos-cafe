import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPublicTables } from '../services/tableService';
import { Coffee, Users, ArrowRight, CalendarDays, MapPin } from 'lucide-react';

const STATUS_LABEL = { FREE: 'Available', OCCUPIED: 'Occupied', RESERVED: 'Reserved' };

export default function TableSelection() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await getPublicTables();
        setTables(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  const freeTables = tables.filter((t) => t.status === 'FREE');
  const occupiedTables = tables.filter((t) => t.status !== 'FREE');

  const handleSelect = (tableId) => navigate(`/order?tableId=${tableId}`);

  if (loading) {
    return (
      <div className="mobile-page">
        <div className="loading-spinner" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-page">
        <div className="menu-error"><p>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="mobile-page">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="mobile-logo-icon">
            <Coffee size={22} />
          </div>
          <div>
            <h1 className="mobile-brand-name">POS Cafe</h1>
            <p className="mobile-brand-sub">Select a table to order</p>
          </div>
        </div>
        <Link to="/book" className="btn btn-primary btn-sm" id="tables-reserve-btn">
          <CalendarDays size={14} />
          Reserve
        </Link>
      </header>

      {/* Stats bar */}
      <div className="ts-stats-bar">
        <span className="ts-stat">
          <span className="ts-stat-dot ts-stat-dot--free" />
          {freeTables.length} available
        </span>
        <span className="ts-stat-sep">·</span>
        <span className="ts-stat">{tables.length} total tables</span>
      </div>

      <main className="mobile-content">
        {/* Available Tables */}
        {freeTables.length > 0 && (
          <section className="ts-section">
            <h2 className="ts-section-title">Choose a Table</h2>
            <div className="ts-grid">
              {freeTables.map((t) => (
                <button
                  key={t._id}
                  className="ts-table-card ts-table-card--free"
                  onClick={() => handleSelect(t._id)}
                  id={`select-table-${t._id}`}
                >
                  <div className="ts-table-number">T{t.tableNumber}</div>
                  <div className="ts-table-info">
                    <Users size={13} />
                    <span>{t.seats} seats</span>
                  </div>
                  {t.floor && (
                    <div className="ts-table-floor">
                      <MapPin size={11} />
                      {t.floor.name}
                    </div>
                  )}
                  <div className="ts-table-cta">
                    <span>Start Order</span>
                    <ArrowRight size={13} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Occupied / Reserved */}
        {occupiedTables.length > 0 && (
          <section className="ts-section">
            <h2 className="ts-section-title ts-section-title--muted">Occupied / Reserved</h2>
            <div className="ts-grid">
              {occupiedTables.map((t) => (
                <div
                  key={t._id}
                  className={`ts-table-card ts-table-card--${t.status.toLowerCase()}`}
                >
                  <div className="ts-table-number">T{t.tableNumber}</div>
                  <div className="ts-table-info">
                    <Users size={13} />
                    <span>{t.seats} seats</span>
                  </div>
                  <span className={`table-status-tag table-status-tag--${t.status}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tables.length === 0 && (
          <div className="menu-empty"><p>No tables configured yet.</p></div>
        )}
      </main>
    </div>
  );
}
