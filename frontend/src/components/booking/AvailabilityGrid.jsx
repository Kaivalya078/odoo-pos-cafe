import SlotButton from './SlotButton';
import { Users } from 'lucide-react';

export default function AvailabilityGrid({ availability, selectedSlot, onSelectSlot, loading }) {
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: 200 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!availability || availability.length === 0) {
    return (
      <div className="bk-empty">
        <p>No tables available. Please select a date to view availability.</p>
      </div>
    );
  }

  return (
    <div className="bk-grid" id="booking-availability-grid">
      {availability.map((table) => (
        <div key={table.tableId} className="bk-table-card">
          <div className="bk-table-card__header">
            <span className="bk-table-card__number">Table {table.tableNumber}</span>
            <span className="bk-table-card__seats">
              <Users size={13} />
              {table.seats} seats
            </span>
          </div>

          <div className="bk-table-card__slots">
            {table.slots.length === 0 ? (
              <p className="bk-table-card__no-slots">No slots available</p>
            ) : (
              table.slots.map((slot) => (
                <SlotButton
                  key={slot.time}
                  slot={slot}
                  tableId={table.tableId}
                  selectedSlot={selectedSlot}
                  onSelect={(time) => onSelectSlot({ tableId: table.tableId, tableNumber: table.tableNumber, time })}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
