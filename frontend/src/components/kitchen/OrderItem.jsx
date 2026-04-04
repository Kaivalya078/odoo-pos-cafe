import { useState } from 'react';
import { Check } from 'lucide-react';

export default function OrderItem({ item, orderId, onPrepare }) {
  const [loading, setLoading] = useState(false);

  const isComplete = item.preparedQuantity >= item.quantity;
  const isInProgress = item.preparedQuantity > 0 && !isComplete;
  const progressPct = (item.preparedQuantity / item.quantity) * 100;

  const handleClick = async () => {
    if (isComplete || loading) return;
    setLoading(true);
    try {
      await onPrepare(orderId, item._id);
    } finally {
      setLoading(false);
    }
  };

  // Build class list
  let className = 'kd-item';
  if (isComplete) className += ' kd-item--complete';
  else if (isInProgress) className += ' kd-item--progress';
  if (loading) className += ' kd-item--loading';

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={isComplete || loading}
      title={
        isComplete
          ? `${item.name} — fully prepared`
          : `Click to prepare 1 ${item.name} (${item.preparedQuantity}/${item.quantity})`
      }
      id={`item-${orderId}-${item._id}`}
    >
      {/* Progress bar background */}
      {!isComplete && item.preparedQuantity > 0 && (
        <span
          className="kd-item__progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      )}

      <span className="kd-item__content">
        <span className="kd-item__qty">{item.quantity}×</span>
        <span className="kd-item__name">{item.name}</span>
        {item.variant?.name && (
          <span className="kd-item__variant">({item.variant.name})</span>
        )}
      </span>

      <span className="kd-item__status">
        {isComplete ? (
          <Check size={14} className="kd-item__check" />
        ) : (
          <span className="kd-item__counter">
            {item.preparedQuantity}/{item.quantity}
          </span>
        )}
      </span>
    </button>
  );
}
