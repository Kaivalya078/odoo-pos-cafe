export default function SessionsTable({ sessions, loading }) {
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: 120 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <p className="an-empty">No closed sessions found.</p>
    );
  }

  return (
    <div className="table-wrap" id="analytics-sessions-table">
      <table className="table">
        <thead>
          <tr>
            <th>Table</th>
            <th>Orders</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Opened</th>
            <th>Closed</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.sessionId}>
              <td>
                <span className="an-table-badge">
                  T{s.tableNumber ?? '—'}
                </span>
              </td>
              <td style={{ fontWeight: 600 }}>{s.totalOrders}</td>
              <td style={{ fontWeight: 700 }}>₹{s.totalAmount.toFixed(2)}</td>
              <td>
                <span className={`an-payment-tag an-payment-tag--${(s.paymentMethod || '').toLowerCase()}`}>
                  {s.paymentMethod || '—'}
                </span>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(s.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {s.closedAt
                  ? new Date(s.closedAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
