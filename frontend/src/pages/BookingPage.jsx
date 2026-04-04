import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAvailability, createBooking } from '../services/bookingService';
import {
  CalendarDays, CheckCircle, Users, Clock, Minus, Plus,
  Loader, ChevronRight, ChevronLeft, Coffee, Utensils,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function autoAssignTable(availability, guestCount) {
  if (!availability || availability.length === 0) return null;
  return availability
    .filter((t) => t.seats >= guestCount && t.slots.some((s) => s.available))
    .sort((a, b) => a.seats - b.seats)[0] ?? null;
}

function fmtTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
  });
}

const TODAY = new Date().toISOString().split('T')[0];

const STEP_DATE_GUESTS = 1;
const STEP_DETAILS     = 2;
const STEP_SUCCESS     = 3;

// ─── Info cards shown below the hero ─────────────────────────────────────────
const INFO_CARDS = [
  { emoji: '🕐', title: '1-Hour Slots',   sub: 'Each booking lasts 1 hour'   },
  { emoji: '🪑', title: 'Auto Table',     sub: 'Best table assigned for you'  },
  { emoji: '📞', title: 'Instant Confirm',sub: 'Booking confirmed right away' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookingPage() {
  // Step
  const [step, setStep] = useState(STEP_DATE_GUESTS);

  // Step 1
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(2);

  // Availability
  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [assignedTable, setAssignedTable] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Step 2
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 3
  const [bookingResult, setBookingResult] = useState(null);

  // ── Fetch availability ─────────────────────────────────────────────────────
  const fetchAvailability = useCallback(async (d) => {
    if (!d) return;
    setLoadingSlots(true);
    setAvailability(null);
    setAssignedTable(null);
    setSelectedSlot('');
    try {
      const res = await getAvailability(d);
      setAvailability(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Re-derive assigned table when availability or guests change
  useEffect(() => {
    if (!availability) return;
    const table = autoAssignTable(availability, guests);
    setAssignedTable(table);
    setSelectedSlot('');
  }, [availability, guests]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    setStep(STEP_DATE_GUESTS);
    fetchAvailability(val);
  };

  const handleGuestChange = (delta) =>
    setGuests((g) => Math.max(1, Math.min(12, g + delta)));

  const handleContinue = () => {
    if (!date)           { toast.error('Please select a date'); return; }
    if (!assignedTable)  { toast.error(`No table available for ${guests} guest${guests > 1 ? 's' : ''}`); return; }
    if (!selectedSlot)   { toast.error('Please select a time slot'); return; }
    setStep(STEP_DETAILS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      const res = await createBooking({
        tableId: assignedTable.tableId,
        name: name.trim(),
        phone: phone.trim(),
        startTime: selectedSlot,
      });
      setBookingResult(res.data.data);
      setStep(STEP_SUCCESS);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAgain = () => {
    setStep(STEP_DATE_GUESTS);
    setDate(''); setGuests(2); setAvailability(null);
    setAssignedTable(null); setSelectedSlot('');
    setName(''); setPhone(''); setBookingResult(null);
  };

  const availableSlots = assignedTable?.slots?.filter((s) => s.available) ?? [];

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="mobile-page bk-mobile-page" id="booking-page">

      {/* ── Sticky Header ── */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="mobile-logo-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="mobile-brand-name">Reserve a Table</h1>
            <p className="mobile-brand-sub">POS Cafe · Book your spot</p>
          </div>
        </div>
        <Link to="/menu" className="btn btn-secondary btn-sm" id="bk-menu-link">
          <Coffee size={13} /> Menu
        </Link>
      </header>

      {/* ════════════════ STEP 1 — Date, Guests & Time ════════════════ */}
      {step === STEP_DATE_GUESTS && (
        <main className="mobile-content bk-step" id="bk-step-main">

          {/* ── Hero banner ── */}
          <div className="bk-hero">
            <div className="bk-hero__emoji">🍽️</div>
            <h2 className="bk-hero__title">Book Your Table</h2>
            <p className="bk-hero__sub">Pick your date, party size, and preferred time — we'll find the perfect table for you.</p>
          </div>

          {/* ── Info tiles (menu-style) ── */}
          <div className="bk-info-grid">
            {INFO_CARDS.map((c) => (
              <div className="bk-info-tile" key={c.title}>
                <span className="bk-info-tile__emoji">{c.emoji}</span>
                <span className="bk-info-tile__title">{c.title}</span>
                <span className="bk-info-tile__sub">{c.sub}</span>
              </div>
            ))}
          </div>

          {/* ── Section: Date ── */}
          <div className="bk-field-section">
            <div className="bk-field-section__label">
              <CalendarDays size={14} /> Select Date
            </div>
            <input
              id="booking-date"
              type="date"
              className="form-input bk-date-input"
              value={date}
              onChange={handleDateChange}
              min={TODAY}
            />
          </div>

          {/* ── Section: Guests ── */}
          <div className="bk-field-section">
            <div className="bk-field-section__label">
              <Users size={14} /> Number of Guests
            </div>
            <div className="bk-stepper">
              <button
                className="bk-stepper__btn"
                onClick={() => handleGuestChange(-1)}
                disabled={guests <= 1}
                type="button"
                id="bk-guest-minus"
              >
                <Minus size={18} />
              </button>
              <div className="bk-stepper__value">
                <span className="bk-stepper__number" id="bk-guest-count">{guests}</span>
                <span className="bk-stepper__sub">guest{guests !== 1 ? 's' : ''}</span>
              </div>
              <button
                className="bk-stepper__btn"
                onClick={() => handleGuestChange(1)}
                disabled={guests >= 12}
                type="button"
                id="bk-guest-plus"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Table assign feedback */}
            {date && (
              <div className="bk-assign-status" id="bk-assign-status">
                {loadingSlots ? (
                  <span className="bk-assign-status__text bk-assign-status--loading">
                    <Loader size={13} className="cs-spin" /> Checking…
                  </span>
                ) : assignedTable ? (
                  <span className="bk-assign-status__text bk-assign-status--ok">
                    ✓ Table {assignedTable.tableNumber} assigned · {assignedTable.seats} seats
                    <span className="bk-assign-status__sub">{availableSlots.length} slots open</span>
                  </span>
                ) : availability ? (
                  <span className="bk-assign-status__text bk-assign-status--none">
                    No table available for {guests} guest{guests > 1 ? 's' : ''} on this date
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Section: Time dropdown ── */}
          {assignedTable && availableSlots.length > 0 && (
            <div className="bk-field-section">
              <div className="bk-field-section__label">
                <Clock size={14} /> Select Time
              </div>
              <div className="bk-select-wrapper">
                <Clock size={15} className="bk-select-icon" />
                <select
                  id="booking-time"
                  className="form-input bk-time-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  <option value="">— Choose a time slot —</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      {fmtTime(slot.time)} · 1 hr
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <button
            className="btn btn-primary bk-cta-btn"
            onClick={handleContinue}
            disabled={!date || loadingSlots || !assignedTable || !selectedSlot}
            id="bk-continue-btn"
          >
            Continue to Details <ChevronRight size={16} />
          </button>
        </main>
      )}

      {/* ════════════════ STEP 2 — Details Form ════════════════ */}
      {step === STEP_DETAILS && (
        <main className="mobile-content bk-step" id="bk-step-details">

          {/* Summary card */}
          <div className="bk-summary-card">
            <div className="bk-summary-card__title">Booking Summary</div>
            <div className="bk-summary-card__rows">
              <div className="bk-summary-row">
                <CalendarDays size={14} /><span>{date}</span>
              </div>
              <div className="bk-summary-row">
                <Clock size={14} />
                <span>{selectedSlot ? fmtTime(selectedSlot) : '—'} (1 hr)</span>
              </div>
              <div className="bk-summary-row">
                <Users size={14} />
                <span>{guests} guest{guests > 1 ? 's' : ''} · Table {assignedTable?.tableNumber} ({assignedTable?.seats} seats)</span>
              </div>
            </div>
          </div>

          <form className="bk-form" onSubmit={handleSubmit} id="booking-form">
            <div className="bk-field-section__label" style={{ marginBottom: 'var(--space-md)' }}>
              <Utensils size={14} /> Your Details
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="booking-name">Full Name</label>
              <input
                id="booking-name"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="booking-phone">Phone Number</label>
              <input
                id="booking-phone"
                className="form-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                required
                autoComplete="tel"
              />
            </div>

            <div className="bk-nav-row">
              <button className="btn btn-secondary bk-back-btn" onClick={() => setStep(STEP_DATE_GUESTS)} type="button">
                <ChevronLeft size={16} /> Back
              </button>
              <button
                type="submit"
                className="btn btn-primary bk-cta-btn bk-cta-btn--flex"
                disabled={submitting || !name.trim() || !phone.trim()}
                id="booking-submit-btn"
              >
                {submitting
                  ? <><Loader size={14} className="cs-spin" /> Booking…</>
                  : <><CheckCircle size={15} /> Confirm Booking</>}
              </button>
            </div>
          </form>
        </main>
      )}

      {/* ════════════════ STEP 3 — Success ════════════════ */}
      {step === STEP_SUCCESS && bookingResult && (
        <main className="mobile-content bk-step" id="bk-step-success">
          <div className="bk-success-screen" id="booking-success">
            <div className="bk-success-screen__anim">
              <CheckCircle size={52} className="bk-success-screen__icon" />
            </div>
            <h2 className="bk-success-screen__title">Booking Confirmed!</h2>
            <p className="bk-success-screen__sub">See you soon, <strong>{bookingResult.name}</strong>!</p>

            <div className="bk-success-screen__details">
              {[
                ['Table',    `Table ${bookingResult.table?.tableNumber}`],
                ['Date',     date],
                ['Time',     `${fmtTime(bookingResult.startTime)} – ${fmtTime(bookingResult.endTime)}`],
                ['Guests',   guests],
                ['Name',     bookingResult.name],
                ['Phone',    bookingResult.phone],
              ].map(([label, val]) => (
                <div className="bk-success-detail-row" key={label}>
                  <span className="bk-success-detail-label">{label}</span>
                  <span className="bk-success-detail-value">{val}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-primary bk-cta-btn" onClick={handleBookAgain} id="bk-book-again">
              Make Another Booking
            </button>
            <Link to="/menu" className="btn btn-secondary bk-cta-btn" style={{ marginTop: 8 }}>
              <Coffee size={14} /> Browse Menu
            </Link>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="menu-footer">
        <p>POS Cafe · Reservations subject to availability</p>
      </footer>
    </div>
  );
}
