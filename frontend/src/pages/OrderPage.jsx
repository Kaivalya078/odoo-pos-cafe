import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPublicMenu, createOrder } from '../services/orderService';
import { Coffee, CheckCircle, ShoppingBag } from 'lucide-react';
import WarningBanner from '../components/WarningBanner';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard';
import Cart from '../components/Cart';

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get('tableId');

  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [bookingWarning, setBookingWarning] = useState(null);

  useEffect(() => {
    if (!tableId) {
      setError('No table selected. Please go back and select a table.');
    }
  }, [tableId]);

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
    fetchMenu();
    // Poll menu every 30 s so availability changes from kitchen reflect here
    menuPollRef.current = setInterval(() => fetchMenu(true), 10_000);
    return () => clearInterval(menuPollRef.current);
  }, [fetchMenu]);

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
    if (!customerName.trim()) { toast.error('Please enter your name'); return; }
    if (cart.length === 0) { toast.error('Your cart is empty'); return; }
    setPlacing(true);
    try {
      const orderItems = cart.map((ci) => {
        const item = { product: ci.product, quantity: ci.quantity };
        if (ci.variant) item.variant = { name: ci.variant.name, price: ci.variant.price };
        if (ci.addons && ci.addons.length > 0) item.addons = ci.addons.map((a) => ({ name: a.name, price: a.price }));
        return item;
      });
      const res = await createOrder({ tableId, customerName: customerName.trim(), items: orderItems });
      setOrderSuccess(res.data.data);
      setBookingWarning(res.data.bookingWarning || null);
      setCart([]);
      setCustomerName('');
      setCartOpen(false);
      toast.success('Order placed successfully!');
      if (res.data.bookingWarning) {
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

  const categories = Object.keys(menu).sort();
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => {
    let price = item.variant?.price || 0;
    (item.addons || []).forEach((a) => { price += a.price; });
    return sum + price * item.quantity;
  }, 0);

  // ── Success state ──
  if (orderSuccess) {
    return (
      <div className="order-page">
        <div className="order-success">
          <CheckCircle size={56} className="order-success-icon" />
          <h2 className="order-success-title">Order Placed!</h2>
          <p className="order-success-text">
            Thank you, <strong>{orderSuccess.customerName}</strong>. Your order has been received and is pending approval.
          </p>
          <div className="order-success-details">
            <div className="order-success-row"><span>Order ID</span><span className="order-success-val">{orderSuccess._id}</span></div>
            <div className="order-success-row"><span>Items</span><span className="order-success-val">{orderSuccess.items?.length || 0}</span></div>
            <div className="order-success-row"><span>Total</span><span className="order-success-val">₹{orderSuccess.totalAmount}</span></div>
            <div className="order-success-row">
              <span>Status</span>
              <span className="status-badge status-badge--open" style={{ fontSize: 11, padding: '2px 8px' }}>
                <span className="status-dot" />{orderSuccess.status}
              </span>
            </div>
          </div>
          {bookingWarning && (
            <WarningBanner
              message="Your order was placed but this table has an upcoming reservation. Staff will assist you."
              id="order-booking-warning"
            />
          )}
          <div className="order-success-actions">
            <button className="btn btn-primary" onClick={() => setOrderSuccess(null)} id="order-another-btn">
              Place Another Order
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/tables')} id="back-to-tables-btn">
              <ArrowLeft size={14} /> Back to Tables
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="order-header-table">Table selected</div>
      </header>

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
      />
    </div>
  );
}
