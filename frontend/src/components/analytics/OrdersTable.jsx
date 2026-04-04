import { Receipt } from 'lucide-react';

export default function OrdersTable({ orders, loading }) {
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: 120 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <p className="an-empty">No paid orders found for this period.</p>
    );
  }

  return (
    <div className="table-wrap" id="analytics-orders-table">
      <table className="table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Table</th>
            <th>Items</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td style={{ fontWeight: 600 }}>{order.customerName}</td>
              <td>
                <span className="an-table-badge">
                  T{order.table?.tableNumber ?? '—'}
                </span>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {order.items?.map((it, i) => (
                  <span key={i}>
                    {it.name}{it.variant?.name ? ` (${it.variant.name})` : ''} ×{it.quantity}
                    {i < order.items.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </td>
              <td style={{ fontWeight: 700 }}>₹{order.totalAmount.toFixed(2)}</td>
              <td>
                <span className={`an-payment-tag an-payment-tag--${(order.paymentMethod || '').toLowerCase()}`}>
                  {order.paymentMethod || '—'}
                </span>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
