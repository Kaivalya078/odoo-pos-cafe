import { Clock, Receipt, IndianRupee } from 'lucide-react';

export default function TableList({ sessions, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: 200 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="cs-table-empty">
        <Receipt size={32} />
        <p>No occupied tables</p>
        <span>Tables will appear here when customers have active sessions.</span>
      </div>
    );
  }

  return (
    <div className="cs-table-list" id="cashier-table-list">
      {sessions.map((s) => {
        const isActive = selectedId === s.sessionId;
        const timeAgo = getTimeAgo(s.createdAt);

        return (
          <button
            key={s.sessionId}
            className={`cs-table-item${isActive ? ' cs-table-item--active' : ''}`}
            onClick={() => onSelect(s.sessionId)}
            id={`cashier-table-${s.tableNumber}`}
          >
            <div className="cs-table-item__header">
              <span className="cs-table-item__number">Table {s.tableNumber}</span>
              <span className="cs-table-item__amount">
                <IndianRupee size={13} />
                {(s.grandTotal ?? s.totalAmount ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="cs-table-item__meta">
              <span className="cs-table-item__orders">
                <Receipt size={12} />
                {s.totalOrders} order{s.totalOrders !== 1 ? 's' : ''}
              </span>
              <span className="cs-table-item__time">
                <Clock size={12} />
                {timeAgo}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
