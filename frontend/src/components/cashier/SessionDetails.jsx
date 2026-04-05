import { IndianRupee, User, Package, AlertTriangle, Wallet } from 'lucide-react';

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

// cashbackRedemptions: { [mobile]: amountToRedeem }
// onRedemptionChange: (mobile, amountToRedeem | null) => void
export default function SessionDetails({ detail, loading, cashbackRedemptions = {}, onRedemptionChange }) {
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

  const { session, orders, subtotal = 0, taxAmount = 0, grandTotal = 0, customerCashbacks = [] } = detail;
  const tableNumber = session?.table?.tableNumber || '—';

  // Group orders by customerName
  const grouped = {};
  orders.forEach((order) => {
    const key = order.customerName || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(order);
  });

  const allPrepared = orders.length > 0 && orders.every((o) => o.status === 'PREPARED');
  const unpreparedCount = orders.filter((o) => o.status !== 'PREPARED' && o.status !== 'REJECTED').length;

  // Total cashback being applied
  const totalCashApplied = Object.values(cashbackRedemptions).reduce((s, v) => s + (v || 0), 0);

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
                  {order.customerMobile && (
                    <span className="cs-order-card__mobile">📱 {order.customerMobile}</span>
                  )}
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
                  {order.cashbackAmount > 0 && !order.cashbackCredited && (
                    <span className="cs-order-card__cashback-pending">
                      <Wallet size={11} /> ₹{order.cashbackAmount.toFixed(2)} cashback on next visit
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Cashback redemption section */}
      {customerCashbacks.length > 0 && (
        <div className="cs-cashback-section">
          <div className="cs-cashback-section__title">
            <Wallet size={14} />
            Customer Cashback
          </div>
          {customerCashbacks.map(({ mobile, cashBalance, redeemableBalance = cashBalance, lockedUntilTomorrow = false, orderTotal }) => {
            const maxRedeemable = Math.min(redeemableBalance, grandTotal);
            const isChecked = !!(cashbackRedemptions[mobile]);
            const appliedAmount = cashbackRedemptions[mobile] || 0;

            return (
              <div key={mobile} className={`cs-cashback-row${isChecked ? ' cs-cashback-row--active' : ''}${lockedUntilTomorrow ? ' cs-cashback-row--locked' : ''}`}>
                <label className="cs-cashback-row__label">
                  <input
                    type="checkbox"
                    className="cs-cashback-checkbox"
                    checked={isChecked}
                    disabled={redeemableBalance <= 0 || maxRedeemable <= 0 || lockedUntilTomorrow}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onRedemptionChange(mobile, maxRedeemable);
                      } else {
                        onRedemptionChange(mobile, null);
                      }
                    }}
                    id={`cashback-cb-${mobile}`}
                  />
                  <div className="cs-cashback-row__info">
                    <span className="cs-cashback-row__mobile">📱 {mobile}</span>
                    <span className="cs-cashback-row__balance">
                      Balance: <strong>₹{cashBalance.toFixed(2)}</strong>
                    </span>
                  </div>
                  {isChecked && (
                    <span className="cs-cashback-row__applied">
                      −₹{appliedAmount.toFixed(2)}
                    </span>
                  )}
                </label>
                {lockedUntilTomorrow && (
                  <span className="cs-cashback-row__locked">🔒 Available from tomorrow</span>
                )}
                {!lockedUntilTomorrow && cashBalance <= 0 && (
                  <span className="cs-cashback-row__empty">No balance</span>
                )}
              </div>
            );
          })}

          {totalCashApplied > 0 && (
            <div className="cs-cashback-total">
              <span>Total Cashback Applied</span>
              <span className="cs-cashback-total__val">−₹{totalCashApplied.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Bill breakdown */}
      <div className="cs-detail__bill-breakdown">
        <div className="cs-detail__bill-row">
          <span>Subtotal</span>
          <span className="cs-detail__bill-val">
            <IndianRupee size={12} />
            {subtotal.toFixed(2)}
          </span>
        </div>
        <div className="cs-detail__bill-row cs-detail__bill-row--tax">
          <span>GST (5%)</span>
          <span className="cs-detail__bill-val cs-detail__bill-val--tax">
            <IndianRupee size={12} />
            {taxAmount.toFixed(2)}
          </span>
        </div>
        {totalCashApplied > 0 && (
          <div className="cs-detail__bill-row cs-detail__bill-row--cashback">
            <span>Cashback Applied</span>
            <span className="cs-detail__bill-val cs-detail__bill-val--cashback">
              −<IndianRupee size={12} />
              {totalCashApplied.toFixed(2)}
            </span>
          </div>
        )}
        <div className="cs-detail__total">
          <span>Grand Total</span>
          <span className="cs-detail__total-amount">
            <IndianRupee size={16} />
            {Math.max(0, grandTotal - totalCashApplied).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
