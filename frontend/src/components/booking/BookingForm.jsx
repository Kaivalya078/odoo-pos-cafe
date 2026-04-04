import { useState } from 'react';
import { User, Phone, Loader } from 'lucide-react';

export default function BookingForm({ selectedSlot, onSubmit, loading }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  if (!selectedSlot) return null;

  const slotTime = new Date(selectedSlot.time);
  const timeLabel = slotTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit({
      tableId: selectedSlot.tableId,
      name: name.trim(),
      phone: phone.trim(),
      startTime: selectedSlot.time, // ISO UTC from backend
    });
  };

  return (
    <div className="bk-form-card" id="booking-form">
      <div className="bk-form-card__header">
        <h3>Complete Your Booking</h3>
        <p>
          Table {selectedSlot.tableNumber} · {timeLabel}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bk-form">
        <div className="form-group">
          <label className="form-label" htmlFor="booking-name">
            <User size={14} /> Full Name
          </label>
          <input
            id="booking-name"
            className="form-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="booking-phone">
            <Phone size={14} /> Phone Number
          </label>
          <input
            id="booking-phone"
            className="form-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !name.trim() || !phone.trim()}
          id="booking-submit-btn"
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <Loader size={14} className="cs-spin" /> Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </form>
    </div>
  );
}
