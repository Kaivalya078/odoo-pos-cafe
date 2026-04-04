import { User, Package, IndianRupee, AlertTriangle } from 'lucide-react';

const STATUS_LABEL = {
  PLACED: 'Placed',
  APPROVED: 'Approved',
  PREPARING: 'Preparing',
  PREPARED: 'Prepared',
  REJECTED: 'Rejected',
};

const STATUS_CLASS = {
  PLACED: 'cs-order-status--placed',
  APPROVED: 'cs-order-status--approved',
  PREPARING: 'cs-order-status--preparing',
  PREPARED: 'cs-order-status--prepared',
  REJECTED: 'cs-order-status--rejected',
};

export default function SessionDetails({ detail, loading }) {
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: 300 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="cs-detail-empty">
        <Package size={40} />
        <p>Select a table to view session details</p>
      </div>
    );
  }

  const { session, orders, totalAmount } = detail;
  const tableNumber = session?.table?.tableNumber || '—';

  // Group orders by customerName
  const grouped = {};
  orders.forEach((order) => {
    const key = order.customerName || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(order);
  });

  // Check if all orders are PREPARED (required for payment)
  const allPrepared = orders.length > 0 && orders.every((o) => o.status === 'PREPARED');
  const unpreparedCount = orders.filter((o) => o.status !== 'PREPARED' && o.status !== 'REJECTED').length;

  return (
    <div className="cs-detail" id="cashier-session-detail">
      {/* Header */}
      <div className="cs-detail__header">
        <h2 className="cs-detail__title">Table {tableNumber}</h2>
        <span className="cs-detail__session-id">
          Session #{session._id.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* Warning if not all prepared */}
      {!allPrepared && unpreparedCount > 0 && (
        <div className="cs-detail__warning">
          <AlertTriangle size={14} />
          {unpreparedCount} order{unpreparedCount !== 1 ? 's' : ''} not yet prepared.
          Payment is blocked until kitchen finishes.
        </div>
      )}

      {/* Orders grouped by customer */}
      <div className="cs-detail__orders">
        {Object.entries(grouped).map(([customerName, customerOrders]) => (
          <div key={customerName} className="cs-customer-group">
            <div className="cs-customer-group__header">
              <User size={14} />
              <span>{customerName}</span>
              <span className="cs-customer-group__count">
                {customerOrders.length} order{customerOrders.length !== 1 ? 's' : ''}
              </span>
            </div>

            {customerOrders.map((order) => (
              <div key={order._id} className="cs-order-card">
                <div className="cs-order-card__header">
                  <span className="cs-order-card__id">#{order._id.slice(-4).toUpperCase()}</span>
                  <span className={`cs-order-status ${STATUS_CLASS[order.status] || ''}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                <div className="cs-order-items">
                  {order.items.map((item, idx) => (
                    <div key={item._id || idx} className="cs-order-item">
                      <div className="cs-order-item__info">
                        <span className="cs-order-item__qty">{item.quantity}×</span>
                        <span className="cs-order-item__name">{item.name}</span>
                        {item.variant?.name && (
                          <span className="cs-order-item__variant">({item.variant.name})</span>
                        )}
                      </div>
                      <span className="cs-order-item__price">₹{item.itemTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {order.items.some((it) => it.addons?.length > 0) && (
                    <div className="cs-order-addons">
                      {order.items
                        .flatMap((it) => it.addons || [])
                        .filter((a) => a.name)
                        .map((addon, i) => (
                          <span key={i} className="cs-addon-tag">
                            + {addon.name} (₹{addon.price})
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div className="cs-order-card__footer">
                  <span className="cs-order-card__total">
                    <IndianRupee size={12} />
                    {order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Total bill */}
      <div className="cs-detail__total">
        <span>Total Bill</span>
        <span className="cs-detail__total-amount">
          <IndianRupee size={16} />
          {totalAmount.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
