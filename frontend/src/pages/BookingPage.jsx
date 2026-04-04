import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getAvailability, createBooking } from '../services/bookingService';
import AvailabilityGrid from '../components/booking/AvailabilityGrid';
import BookingForm from '../components/booking/BookingForm';
import { CalendarDays, CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BookingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || '';

  const [date, setDate] = useState(dateParam);
  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchAvailability = useCallback(async (selectedDate) => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setSuccess(null);
    try {
      const res = await getAvailability(selectedDate);
      setAvailability(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load availability');
      setAvailability(null);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (dateParam) { setDate(dateParam); fetchAvailability(dateParam); }
  }, [dateParam, fetchAvailability]);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    if (val) setSearchParams({ date: val }); else setSearchParams({});
    fetchAvailability(val);
  };

  const handleSelectSlot = (slot) => { setSelectedSlot(slot); setSuccess(null); };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await createBooking(data);
      setSuccess(res.data.data);
      setSelectedSlot(null);
      fetchAvailability(date);
      toast.success('Booking confirmed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-page" id="booking-page">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="mobile-logo-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="mobile-brand-name">Reserve a Table</h1>
            <p className="mobile-brand-sub">Pick date, time & table</p>
          </div>
        </div>
        <Link to="/tables" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          Tables
        </Link>
      </header>

      <div className="mobile-content" style={{ paddingBottom: 'var(--space-2xl)' }}>
        {/* Date picker card */}
        <div className="bk-date-card">
          <div className="bk-date-card-label">
            <Clock size={14} />
            Select Date
          </div>
          <input
            id="booking-date"
            type="date"
            className="form-input bk-date-input"
            value={date}
            onChange={handleDateChange}
            min={today}
          />
        </div>

        {/* Success */}
        {success && (
          <div className="bk-success-card" id="booking-success">
            <CheckCircle size={36} className="bk-success-icon" />
            <h3 className="bk-success-title">Booking Confirmed!</h3>
            <p className="bk-success-info">
              Table {success.table?.tableNumber} reserved for <strong>{success.name}</strong>
            </p>
            <p className="bk-success-time">
              {new Date(success.startTime).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
              })}
              {' – '}
              {new Date(success.endTime).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
              })}
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSuccess(null)}
            >
              Book Another
            </button>
          </div>
        )}

        {/* Availability Grid */}
        {date && !success && (
          <div className="bk-slots-section">
            <h2 className="pm-section-title" style={{ marginTop: 'var(--space-lg)' }}>
              Available Slots
            </h2>
            <AvailabilityGrid
              availability={availability}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
              loading={loadingSlots}
            />
          </div>
        )}

        {/* Booking Form */}
        {selectedSlot && !success && (
          <div className="bk-form-section">
            <BookingForm
              selectedSlot={selectedSlot}
              onSubmit={handleSubmit}
              loading={submitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
