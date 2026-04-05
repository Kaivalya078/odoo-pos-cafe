import { useState } from 'react';
import OrderItem from './OrderItem';
import { Clock, CheckCircle2, Flame, ChevronsRight, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  APPROVED: { label: 'To Cook', icon: Clock, modifier: 'approved' },
  PREPARING: { label: 'Preparing', icon: Flame, modifier: 'preparing' },
  PREPARED: { label: 'Completed', icon: CheckCircle2, modifier: 'prepared' },
};

// What the advance button says based on current status
const ADVANCE_LABEL = {
  APPROVED: 'Move to Preparing',
  PREPARING: 'Mark All Prepared',
};

export default function OrderCard({ order, onPrepare, onAdvance }) {
  const [advancing, setAdvancing] = useState(false);

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.APPROVED;
  const StatusIcon = config.icon;

  // Build a short ticket number from the order _id (last 4 hex chars)
  const ticketNumber = order._id.slice(-4).toUpperCase();

  // Calculate overall progress
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrepped = order.items.reduce((s, i) => s + i.preparedQuantity, 0);
  const progressPct = totalQty > 0 ? Math.round((totalPrepped / totalQty) * 100) : 0;

  const canAdvance = onAdvance && ['APPROVED', 'PREPARING'].includes(order.status);

  const handleAdvance = async (e) => {
    e.stopPropagation();
    if (advancing || !canAdvance) return;
    setAdvancing(true);
    try {
      await onAdvance(order._id, order.status);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className={`kd-card kd-card--${config.modifier}`} id={`order-card-${order._id}`}>
      {/* Card header — contains ticket info + advance button */}
      <div className="kd-card__header">
        <div className="kd-card__ticket">
          <span className="kd-card__ticket-hash">#</span>
          {ticketNumber}
        </div>
        <div className={`kd-card__badge kd-card__badge--${config.modifier}`}>
          <StatusIcon size={12} />
          {config.label}
        </div>

        {/* Advance whole order button */}
        {canAdvance && (
          <button
            className={`kd-card__advance-btn${advancing ? ' kd-card__advance-btn--loading' : ''}`}
            onClick={handleAdvance}
            disabled={advancing}
            title={ADVANCE_LABEL[order.status]}
            id={`advance-order-${order._id}`}
          >
            {advancing ? (
              <Loader2 size={12} className="kd-spin" />
            ) : (
              <ChevronsRight size={12} />
            )}
            {advancing ? 'Moving…' : ADVANCE_LABEL[order.status]}
          </button>
        )}
      </div>

      {/* Meta row */}
      <div className="kd-card__meta">
        {order.table?.tableNumber && (
          <span className="kd-card__table">T{order.table.tableNumber}</span>
        )}
        <span className="kd-card__customer">{order.customerName}</span>
      </div>

      {/* Progress bar (only for non-completed) */}
      {order.status !== 'PREPARED' && (
        <div className="kd-card__progress-track">
          <div
            className="kd-card__progress-bar"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Items list — individual item ticking still works */}
      <div className="kd-card__items">
        {order.items.map((item) => (
          <OrderItem
            key={item._id}
            item={item}
            orderId={order._id}
            onPrepare={onPrepare}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="kd-card__footer">
        <span className="kd-card__progress-text">
          {totalPrepped}/{totalQty} items
        </span>
        {progressPct === 100 && (
          <span className="kd-card__done-label">
            <CheckCircle2 size={12} /> Done
          </span>
        )}
      </div>
    </div>
  );
}
