import { Armchair, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteTable, updateTableStatus } from '../services/tableService';

const VALID_STATUSES = ['FREE', 'OCCUPIED', 'RESERVED'];

const STATUS_CLASS = {
  FREE: 'table-card--free',
  OCCUPIED: 'table-card--occupied',
  RESERVED: 'table-card--reserved',
};

export default function TableGrid({ tables, selectedFloor, loading, onTableDeleted, onTableUpdated }) {
  if (!selectedFloor) {
    return (
      <div className="card">
        <div className="card-title">
          <Armchair size={16} />
          Tables
        </div>
        <div className="table-grid-empty">Select a floor to view tables</div>
      </div>
    );
  }

  const handleDelete = async (table) => {
    if (!window.confirm(`Delete Table ${table.tableNumber}?`)) return;
    try {
      await deleteTable(table._id);
      toast.success(`Table ${table.tableNumber} deleted`);
      onTableDeleted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete table');
    }
  };

  const handleStatusChange = async (table, newStatus) => {
    try {
      await updateTableStatus(table._id, newStatus);
      toast.success(`Table ${table.tableNumber} → ${newStatus}`);
      onTableUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <Armchair size={16} />
        Tables — {selectedFloor.name}
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : tables.length === 0 ? (
        <div className="table-grid-empty">No tables on this floor yet.</div>
      ) : (
        <div className="table-grid">
          {tables.map((t) => (
            <div
              key={t._id}
              className={`table-card ${STATUS_CLASS[t.status] || ''}`}
              id={`table-card-${t._id}`}
            >
              <div className="table-card-header">
                <span className="table-card-number">#{t.tableNumber}</span>
                <button
                  className="table-card-delete"
                  onClick={() => handleDelete(t)}
                  title="Delete table"
                  id={`delete-table-${t._id}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="table-card-seats">{t.seats} seats</div>
              <select
                className={`table-status-select table-status-select--${t.status}`}
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value)}
                id={`status-select-${t._id}`}
              >
                {VALID_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
