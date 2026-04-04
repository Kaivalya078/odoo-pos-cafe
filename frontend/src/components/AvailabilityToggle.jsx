import { useState } from 'react';

export default function AvailabilityToggle({ productId, availability, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const isAvailable = availability === 'AVAILABLE';

  const handleClick = async () => {
    setToggling(true);
    try {
      await onToggle(productId);
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      className={`availability-toggle ${isAvailable ? 'availability-toggle--on' : 'availability-toggle--off'}`}
      onClick={handleClick}
      disabled={toggling}
      title={isAvailable ? 'Mark Unavailable' : 'Mark Available'}
      id={`toggle-availability-${productId}`}
    >
      <span className="availability-toggle__track">
        <span className="availability-toggle__thumb" />
      </span>
      <span className="availability-toggle__label">
        {toggling ? '…' : isAvailable ? 'Available' : 'Unavailable'}
      </span>
    </button>
  );
}
