import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getAvailability, createBooking } from '../services/bookingService';
import AvailabilityGrid from '../components/booking/AvailabilityGrid';
import BookingForm from '../components/booking/BookingForm';
import { CalendarDays, CheckCircle, ArrowLeft } from 'lucide-react';
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

  // Get today as YYYY-MM-DD for min date
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
      const msg = err.response?.data?.message || 'Failed to load availability';
      toast.error(msg);
      setAvailability(null);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // If ?date= param is present on mount, fetch immediately
  useEffect(() => {
    if (dateParam) {
      setDate(dateParam);
      fetchAvailability(dateParam);
    }
  }, [dateParam, fetchAvailability]);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    // Update URL to /book?date=YYYY-MM-DD
    if (val) {
      setSearchParams({ date: val });
    } else {
      setSearchParams({});
    }
    fetchAvailability(val);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setSuccess(null);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await createBooking(data);
      const booking = res.data.data;
      setSuccess(booking);
      setSelectedSlot(null);
      // Refresh availability after booking
      fetchAvailability(date);
      toast.success('Booking confirmed!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bk-page" id="booking-page">
      {/* Header */}
      <div className="bk-hero">
        <Link to="/tables" className="bk-back-link">
          <ArrowLeft size={16} />
          Back to Tables
        </Link>

        <h1 className="bk-hero__title">
          <CalendarDays size={28} />
          Reserve a Table
        </h1>
        <p className="bk-hero__subtitle">
          Pick a date, choose your table and time slot, and book in seconds
        </p>

        {/* Date picker */}
        <div className="bk-date-picker" id="booking-date-picker">
          <label className="bk-date-picker__label" htmlFor="booking-date">
            Select Date
          </label>
          <input
            id="booking-date"
            type="date"
            className="form-input bk-date-picker__input"
            value={date}
            onChange={handleDateChange}
            min={today}
          />
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="bk-success" id="booking-success">
          <CheckCircle size={32} />
          <h3>Booking Confirmed!</h3>
          <p>
            Table {success.table?.tableNumber} reserved for <strong>{success.name}</strong>
          </p>
          <p className="bk-success__time">
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
        <AvailabilityGrid
          availability={availability}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          loading={loadingSlots}
        />
      )}

      {/* Booking Form */}
      {selectedSlot && !success && (
        <BookingForm
          selectedSlot={selectedSlot}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      )}
    </div>
  );
}
