import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPublicMenu, createOrder } from '../services/orderService';
import { getPublicTables } from '../services/tableService';
import { requestOtp, verifyOtp } from '../services/customerService';
import { Coffee, ShoppingBag, ArrowLeft, RefreshCw, Phone, KeyRound, Wallet, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard';
import Cart from '../components/Cart';

// ── OTP Gate Steps ─────────────────────────────────────────────────────────
function PhoneEntry({ onVerified, onSkip }) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cashBalance, setCashBalance] = useState(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(mobile);
      // In dev mode the OTP is returned in the body — show it prominently
      if (res.data.otp) {
        toast(`OTP: ${res.data.otp} (relay to customer)`, {
          icon: '🔑',
          duration: 30000,
          style: { fontWeight: 700, fontSize: 16 },
        });
      }
      toast.success('OTP sent!');
      setStep('otp');
      setCountdown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp(mobile, otp);
      setCashBalance(res.data.cashBalance || 0);
      // Brief success show then hand off
      toast.success('Verified! Welcome 🎉');
      setTimeout(() => onVerified(mobile, res.data.cashBalance || 0), 800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-gate">
      <div className="otp-gate__card">
        {/* Brand */}
        <div className="otp-gate__brand">
          <div className="otp-gate__logo"><Coffee size={28} /></div>
          <h1 className="otp-gate__title">POS Cafe</h1>
          <p className="otp-gate__subtitle">Enter your mobile to start ordering &amp; earn cashback</p>
        </div>

        {step === 'phone' ? (
          <>
            <div className="otp-gate__field">
              <label className="otp-gate__label">
                <Phone size={14} /> Mobile Number
              </label>
              <input
                className="otp-gate__input"
                type="tel"
                inputMode="numeric"
                placeholder="98XXXXXXXX"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                id="otp-mobile-input"
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary otp-gate__btn"
              onClick={handleSendOtp}
              disabled={loading || mobile.length !== 10}
              id="otp-send-btn"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>

            <button
              className="otp-gate__skip"
              onClick={onSkip}
              id="otp-skip-btn"
            >
              <SkipForward size={13} /> Skip — order without cashback
            </button>
          </>
        ) : (
          <>
            <p className="otp-gate__mobile-display">
              OTP sent to <strong>+91 {mobile}</strong>
            </p>
            <div className="otp-gate__field">
              <label className="otp-gate__label">
                <KeyRound size={14} /> 6-Digit OTP
              </label>
              <input
                className="otp-gate__input otp-gate__input--otp"
                type="tel"
                inputMode="numeric"
                placeholder="······"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                id="otp-code-input"
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary otp-gate__btn"
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              id="otp-verify-btn"
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <div className="otp-gate__resend">
              {countdown > 0 ? (
                <span>Resend in {countdown}s</span>
              ) : (
                <button className="otp-gate__resend-btn" onClick={handleSendOtp} disabled={loading}>
                  Resend OTP
                </button>
              )}
              <span className="otp-gate__divider">·</span>
              <button className="otp-gate__back-btn" onClick={() => { setStep('phone'); setOtp(''); }}>
                Change number
              </button>
            </div>

            <button className="otp-gate__skip" onClick={onSkip} id="otp-skip-from-otp-btn">
              <SkipForward size={13} /> Skip cashback
            </button>
          </>
        )}

        <div className="otp-gate__cashback-info">
          <Wallet size={14} />
          <span>Earn <strong>10% cashback</strong> on every order after preparation</span>
        </div>
      </div>
    </div>
  );
}

// ── Main OrderPage ──────────────────────────────────────────────────────────
export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get('tableId') || sessionStorage.getItem('pos_tableId');

  // OTP state
  const [otpDone, setOtpDone] = useState(false);
  const [customerMobile, setCustomerMobile] = useState(null);
  const [customerCashBalance, setCustomerCashBalance] = useState(0);

  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [tableNumber, setTableNumber] = useState(null);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (tableId) sessionStorage.setItem('pos_tableId', tableId);
    else setError('No table selected. Please go back and select a table.');
  }, [tableId]);

  useEffect(() => {
    if (!tableId) return;
    getPublicTables()
      .then((res) => {
        const t = res.data.data.find((tbl) => tbl._id === tableId);
        if (t) setTableNumber(t.tableNumber);
      })
      .catch(() => {});
  }, [tableId]);

  const handleChangeTable = () => {
    sessionStorage.removeItem('pos_tableId');
    navigate('/tables', { replace: true });
  };

  const menuPollRef = useRef(null);

  const fetchMenu = useCallback(async (silent = false) => {
    if (!tableId) return;
    if (!silent) setLoading(true);
    try {
      const res = await getPublicMenu();
      const data = res.data.data;
      setMenu(data);
      if (!silent) {
        const cats = Object.keys(data).sort();
        if (cats.length > 0) setActiveCategory(cats[0]);
      }
    } catch {
      if (!silent) setError('Failed to load menu. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (!otpDone) return; // Don't fetch menu until OTP is done
    fetchMenu();
    menuPollRef.current = setInterval(() => fetchMenu(true), 10_000);
    return () => clearInterval(menuPollRef.current);
  }, [fetchMenu, otpDone]);

  const handleOtpVerified = (mobile, cashBalance) => {
    setCustomerMobile(mobile);
    setCustomerCashBalance(cashBalance);
    setOtpDone(true);
  };

  const handleSkipOtp = () => {
    setCustomerMobile(null);
    setCustomerCashBalance(0);
    setOtpDone(true);
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((ci) => {
        if (ci.product !== item.product) return false;
        if ((ci.variant?.name || '') !== (item.variant?.name || '')) return false;
        const ciAddons = (ci.addons || []).map((a) => a.name).sort().join(',');
        const itemAddons = (item.addons || []).map((a) => a.name).sort().join(',');
        return ciAddons === itemAddons;
      });
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + item.quantity };
        return updated;
      }
      return [...prev, item];
    });
    toast.success(`${item.productName} added to cart`);
  };

  const updateCartQty = (idx, newQty) => {
    if (newQty < 1) { removeCartItem(idx); return; }
    setCart((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: newQty } : item)));
  };

  const removeCartItem = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error('Your cart is empty'); return; }
    setPlacing(true);
    try {
      const orderItems = cart.map((ci) => {
        const item = { product: ci.product, quantity: ci.quantity };
        if (ci.variant) item.variant = { name: ci.variant.name, price: ci.variant.price };
        if (ci.addons && ci.addons.length > 0) item.addons = ci.addons.map((a) => ({ name: a.name, price: a.price }));
        return item;
      });
      const res = await createOrder({
        tableId,
        customerName: customerName.trim() || 'Customer',
        customerMobile: customerMobile || undefined,
        items: orderItems,
      });
      const placedOrder = res.data.data;
      const warning = res.data.bookingWarning || null;
      setCart([]);
      setCustomerName('');
      setCartOpen(false);
      toast.success(
        customerMobile
          ? `Order placed! ₹${placedOrder.cashbackAmount} cashback pending after preparation.`
          : `Order placed! (₹${placedOrder.totalAmount})`,
        { duration: 5000, icon: '✅' }
      );
      if (warning) {
        toast('This table has an upcoming reservation. Staff will assist you.', {
          icon: '⚠️', duration: 6000,
          style: { background: '#332b00', border: '1px solid #665500', color: '#fbbf24' },
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  // ── Render: OTP gate ──────────────────────────────────────────────────────
  if (!otpDone) {
    return <PhoneEntry onVerified={handleOtpVerified} onSkip={handleSkipOtp} />;
  }

  const categories = Object.keys(menu).sort();
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => {
    let price = item.variant?.price || 0;
    (item.addons || []).forEach((a) => { price += a.price; });
    return sum + price * item.quantity;
  }, 0);

  if (error) {
    return (
      <div className="order-page">
        <div className="order-error-page">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/tables')}>
            <ArrowLeft size={14} /> Go to Table Selection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-page">
        <div className="loading-spinner" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="order-page order-page--mobile">
      {/* Sticky Header */}
      <header className="order-mobile-header">
        <div className="order-header-brand">
          <Coffee size={18} />
          <span>POS Cafe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Cashback badge */}
          {customerMobile && (
            <div className="order-cashback-badge" title={`₹${customerCashBalance} cashback available`}>
              <Wallet size={12} />
              <span>₹{customerCashBalance.toFixed(0)}</span>
            </div>
          )}
          {tableNumber && (
            <div className="order-header-table">Table {tableNumber}</div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleChangeTable}
            id="change-table-btn"
            title="Change table"
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            <RefreshCw size={12} /> Change Table
          </button>
        </div>
      </header>

      {/* Cashback info strip */}
      {customerMobile && (
        <div className="order-cashback-strip">
          <Wallet size={13} />
          <span>Ordering as <strong>+91 {customerMobile}</strong> · ₹{customerCashBalance.toFixed(2)} available cashback</span>
        </div>
      )}

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="category-chips-wrapper">
          <div className="category-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-chip${activeCategory === cat ? ' category-chip--active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat);
                  document.getElementById(`cat-section-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product list */}
      <main className="order-menu-mobile">
        {categories.length === 0 ? (
          <div className="menu-empty"><p>No items available right now.</p></div>
        ) : (
          categories.map((cat) => (
            <section key={cat} id={`cat-section-${cat}`} className="order-menu-category">
              <h2 className="menu-category-title">{cat}</h2>
              <div className="order-products-list">
                {menu[cat].map((product) => (
                  <ProductCard key={product._id} product={product} onAddToCart={addToCart} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Sticky cart bar */}
      {itemCount > 0 && (
        <div className="sticky-cart-bar">
          <button
            className="sticky-cart-btn"
            onClick={() => setCartOpen(true)}
            id="open-cart-btn"
          >
            <div className="sticky-cart-left">
              <span className="sticky-cart-count">{itemCount}</span>
              <span>View Cart</span>
            </div>
            <div className="sticky-cart-right">
              <ShoppingBag size={16} />
              <span>₹{totalAmount.toFixed(0)}</span>
            </div>
          </button>
        </div>
      )}

      {/* Cart bottom sheet */}
      <Cart
        items={cart}
        onUpdateQty={updateCartQty}
        onRemove={removeCartItem}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        onPlaceOrder={handlePlaceOrder}
        placing={placing}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        customerMobile={customerMobile}
      />
    </div>
  );
}
