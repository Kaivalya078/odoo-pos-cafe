export default function SlotButton({ slot, tableId, selectedSlot, onSelect, disabled }) {
  const time = new Date(slot.time);
  const label = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  // Must match BOTH tableId and time — prevents cross-table highlight
  const isSelected =
    selectedSlot?.tableId === tableId && selectedSlot?.time === slot.time;
  const isUnavailable = !slot.available;

  let className = 'bk-slot';
  if (isUnavailable) className += ' bk-slot--unavailable';
  else if (isSelected) className += ' bk-slot--selected';

  return (
    <button
      className={className}
      onClick={() => onSelect(slot.time)}
      disabled={isUnavailable || disabled}
      type="button"
    >
      {label}
    </button>
  );
}
