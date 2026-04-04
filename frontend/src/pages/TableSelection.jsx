import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPublicTables } from '../services/tableService';
import { Coffee, Users, ArrowRight, CalendarDays } from 'lucide-react';

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

  const handleSelect = (tableId) => {
    navigate(`/order?tableId=${tableId}`);
  };

  if (loading) {
    return (
      <div className="ts-page">
        <div className="loading-spinner" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ts-page">
        <div className="ts-container">
          <div className="menu-error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-page">
      {/* Header */}
      <header className="menu-header">
        <div className="menu-header-content">
          <div className="menu-logo">
            <Coffee size={28} />
          </div>
          <h1 className="menu-title">POS Cafe</h1>
          <p className="menu-subtitle">Select a table to start your order</p>
          <div className="menu-meta">
            <span>{freeTables.length} available</span>
            <span className="menu-meta-dot">·</span>
            <span>{tables.length} total tables</span>
          </div>
        </div>
        <div className="menu-header-actions">
          <Link to="/book" className="btn btn-primary btn-sm" id="tables-reserve-btn">
            <CalendarDays size={14} />
            Reserve a Table
          </Link>
        </div>
      </header>

      <main className="ts-container">
        {/* Available Tables */}
        {freeTables.length > 0 && (
          <section className="ts-section">
            <h2 className="ts-section-title">Available Tables</h2>
            <div className="ts-grid">
              {freeTables.map((t) => (
                <button
                  key={t._id}
                  className="ts-table-card ts-table-card--free"
                  onClick={() => handleSelect(t._id)}
                  id={`select-table-${t._id}`}
                >
                  <div className="ts-table-number">Table {t.tableNumber}</div>
                  <div className="ts-table-info">
                    <Users size={14} />
                    <span>{t.seats} seats</span>
                  </div>
                  {t.floor && (
                    <div className="ts-table-floor">{t.floor.name}</div>
                  )}
                  <div className="ts-table-action">
                    <span>Start Order</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Occupied/Reserved Tables */}
        {occupiedTables.length > 0 && (
          <section className="ts-section">
            <h2 className="ts-section-title" style={{ color: 'var(--text-muted)' }}>Occupied / Reserved</h2>
            <div className="ts-grid">
              {occupiedTables.map((t) => (
                <div
                  key={t._id}
                  className={`ts-table-card ts-table-card--${t.status.toLowerCase()}`}
                >
                  <div className="ts-table-number">Table {t.tableNumber}</div>
                  <div className="ts-table-info">
                    <Users size={14} />
                    <span>{t.seats} seats</span>
                  </div>
                  <span className={`table-status-tag table-status-tag--${t.status}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tables.length === 0 && (
          <div className="menu-empty">
            <p>No tables configured yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
