import { useState, useEffect, useCallback, useRef } from 'react';
import { getKitchenOrders, updateItemPrepared } from '../services/kitchenService';
import { getKitchenProducts, toggleAvailability } from '../services/productService';
import OrderCard from '../components/kitchen/OrderCard';
import { ChefHat, Search, RefreshCw, X, LayoutGrid, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

const ORDER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'APPROVED', label: 'To Cook' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'PREPARED', label: 'Completed' },
];

const SCREEN_TABS = [
  { key: 'ORDERS', label: 'Orders', icon: ShoppingBag },
  { key: 'PRODUCTS', label: 'Product Availability', icon: LayoutGrid },
];

const POLL_INTERVAL = 10_000; // 10 s — system-wide real-time standard

export default function KitchenScreen() {
  const [screenTab, setScreenTab] = useState('ORDERS');

  // ── Orders state ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('APPROVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);
  const productsPollRef = useRef(null);

  // ── Products state ─────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [productSearch, setProductSearch] = useState('');

  // ── Fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getKitchenOrders();
      const normalized = (res.data.data || []).map((order) => ({
        ...order,
        items: (order.items || []).map((item, idx) => ({
          ...item,
          _id: item._id || `fallback-${order._id}-${idx}`,
          preparedQuantity: item.preparedQuantity ?? 0,
        })),
      }));
      setOrders(normalized);
    } catch (err) {
      if (!silent) toast.error('Failed to load kitchen orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchOrders]);

  // ── Fetch products ─────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await getKitchenProducts();
      setProducts(res.data.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Fetch + auto-poll products whenever Products tab is active
  useEffect(() => {
    if (screenTab === 'PRODUCTS') {
      fetchProducts();
      productsPollRef.current = setInterval(fetchProducts, 10_000);
    } else {
      clearInterval(productsPollRef.current);
    }
    return () => clearInterval(productsPollRef.current);
  }, [screenTab, fetchProducts]);

  // ── Item preparation handler ───────────────────────────────────────────────
  const handlePrepare = async (orderId, itemId) => {
    if (itemId.startsWith('fallback-')) {
      toast.error('Item ID missing from backend — cannot update preparation');
      return;
    }
    try {
      const res = await updateItemPrepared(orderId, itemId);
      const raw = res.data.data;
      const updatedOrder = {
        ...raw,
        items: (raw.items || []).map((item, idx) => ({
          ...item,
          _id: item._id || `fallback-${raw._id}-${idx}`,
          preparedQuantity: item.preparedQuantity ?? 0,
        })),
      };
      setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update item';
      toast.error(msg);
      fetchOrders(true);
    }
  };

  // ── Availability toggle ────────────────────────────────────────────────────
  const handleToggle = async (productId, productName, currentStatus) => {
    if (togglingId) return;
    setTogglingId(productId);
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) =>
        p._id === productId
          ? { ...p, availability: currentStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE' }
          : p
      )
    );
    try {
      await toggleAvailability(productId);
      const newStatus = currentStatus === 'AVAILABLE' ? 'Unavailable' : 'Available';
      toast.success(`${productName} marked as ${newStatus}`);
    } catch {
      // Revert optimistic update on error
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, availability: currentStatus } : p))
      );
      toast.error('Failed to update availability');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((order) => {
    if (activeTab !== 'ALL' && order.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesItem = order.items.some((item) => item.name.toLowerCase().includes(q));
      const matchesCustomer = order.customerName?.toLowerCase().includes(q);
      const matchesTicket = order._id.slice(-4).toLowerCase().includes(q);
      if (!matchesItem && !matchesCustomer && !matchesTicket) return false;
    }
    return true;
  });

  const counts = {
    ALL: orders.length,
    APPROVED: orders.filter((o) => o.status === 'APPROVED').length,
    PREPARING: orders.filter((o) => o.status === 'PREPARING').length,
    PREPARED: orders.filter((o) => o.status === 'PREPARED').length,
  };

  // Group products by category
  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  const groupedProducts = filteredProducts.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const availableCount = products.filter((p) => p.availability === 'AVAILABLE').length;
  const unavailableCount = products.filter((p) => p.availability === 'UNAVAILABLE').length;

  return (
    <div className="kd-page" id="kitchen-dashboard">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="kd-header-row">
          <div>
            <h1 className="page-title">
              <ChefHat size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              Kitchen Display
            </h1>
            <p className="page-subtitle">Real-time order preparation workflow</p>
          </div>
          <button
            className={`btn btn-secondary btn-sm kd-refresh-btn${refreshing ? ' kd-refresh-btn--spin' : ''}`}
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            id="kitchen-refresh-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Screen-level tab switcher (Orders vs Products) */}
      <div className="kd-screen-tabs">
        {SCREEN_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`kd-screen-tab${screenTab === key ? ' kd-screen-tab--active' : ''}`}
            onClick={() => setScreenTab(key)}
            id={`kitchen-screen-tab-${key.toLowerCase()}`}
          >
            <Icon size={15} />
            {label}
            {key === 'PRODUCTS' && products.length > 0 && (
              <span className="kd-avail-summary">
                <span className="kd-avail-dot kd-avail-dot--on" />
                {availableCount}
                <span className="kd-avail-dot kd-avail-dot--off" style={{ marginLeft: 6 }} />
                {unavailableCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ORDERS PANEL ──────────────────────────────────────────────────── */}
      {screenTab === 'ORDERS' && (
        <>
          {/* Toolbar: Tabs + Search */}
          <div className="kd-toolbar">
            <div className="kd-tabs">
              {ORDER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`kd-tab${activeTab === tab.key ? ' kd-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  id={`kitchen-tab-${tab.key.toLowerCase()}`}
                >
                  {tab.label}
                  <span className="kd-tab__count">{counts[tab.key]}</span>
                </button>
              ))}
            </div>

            <div className="kd-search">
              <Search size={14} className="kd-search__icon" />
              <input
                type="text"
                className="kd-search__input"
                placeholder="Search by product, customer, or ticket…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="kitchen-search-input"
              />
              {searchQuery && (
                <button
                  className="kd-search__clear"
                  onClick={() => setSearchQuery('')}
                  id="kitchen-search-clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading-spinner" style={{ minHeight: 300 }}>
              <div className="spinner" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="placeholder-screen" style={{ minHeight: 300 }}>
              <ChefHat className="placeholder-icon" />
              <h2 className="placeholder-title">
                {searchQuery
                  ? 'No matching orders'
                  : activeTab === 'ALL'
                    ? 'No orders yet'
                    : `No ${ORDER_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} orders`}
              </h2>
              <p className="placeholder-text">
                {searchQuery
                  ? 'Try adjusting your search query.'
                  : 'Orders will appear here once customers place them and admin approves.'}
              </p>
            </div>
          ) : (
            <div className="kd-grid">
              {filteredOrders.map((order) => (
                <OrderCard key={order._id} order={order} onPrepare={handlePrepare} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PRODUCTS AVAILABILITY PANEL ────────────────────────────────────── */}
      {screenTab === 'PRODUCTS' && (
        <div className="kd-avail-panel">
          {/* Panel header */}
          <div className="kd-avail-header">
            <div className="kd-avail-header-info">
              <p className="kd-avail-subtitle">
                Toggle product availability — changes reflect instantly on the customer menu.
              </p>
              <div className="kd-avail-stats">
                <span className="kd-stat kd-stat--on">
                  <span className="kd-avail-dot kd-avail-dot--on" />
                  {availableCount} Available
                </span>
                <span className="kd-stat kd-stat--off">
                  <span className="kd-avail-dot kd-avail-dot--off" />
                  {unavailableCount} Unavailable
                </span>
              </div>
            </div>
            <div className="kd-avail-actions">
              <div className="kd-search" style={{ flex: 'unset', minWidth: 220, maxWidth: 280 }}>
                <Search size={14} className="kd-search__icon" />
                <input
                  type="text"
                  className="kd-search__input"
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  id="kitchen-product-search"
                />
                {productSearch && (
                  <button
                    className="kd-search__clear"
                    onClick={() => setProductSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                className={`btn btn-secondary btn-sm kd-refresh-btn${productsLoading ? ' kd-refresh-btn--spin' : ''}`}
                onClick={fetchProducts}
                disabled={productsLoading}
                id="kitchen-products-refresh"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {productsLoading ? (
            <div className="loading-spinner" style={{ minHeight: 240 }}>
              <div className="spinner" />
            </div>
          ) : products.length === 0 ? (
            <div className="placeholder-screen" style={{ minHeight: 240 }}>
              <LayoutGrid className="placeholder-icon" />
              <h2 className="placeholder-title">No products found</h2>
              <p className="placeholder-text">Add products from the Owner or Admin panel.</p>
            </div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <div className="placeholder-screen" style={{ minHeight: 160 }}>
              <Search className="placeholder-icon" size={36} />
              <h2 className="placeholder-title">No matching products</h2>
            </div>
          ) : (
            <div className="kd-avail-categories">
              {Object.keys(groupedProducts).sort().map((category) => (
                <div className="kd-avail-category" key={category}>
                  <div className="kd-avail-category-header">
                    <span className="kd-avail-category-name">{category}</span>
                    <span className="kd-avail-category-count">
                      {groupedProducts[category].filter((p) => p.availability === 'AVAILABLE').length}
                      /{groupedProducts[category].length} available
                    </span>
                  </div>
                  <div className="kd-avail-products">
                    {groupedProducts[category].map((product) => {
                      const isAvailable = product.availability === 'AVAILABLE';
                      const isToggling = togglingId === product._id;
                      return (
                        <div
                          key={product._id}
                          className={`kd-avail-row${!isAvailable ? ' kd-avail-row--off' : ''}${isToggling ? ' kd-avail-row--loading' : ''}`}
                          id={`avail-row-${product._id}`}
                        >
                          <div className="kd-avail-product-info">
                            <span className="kd-avail-product-name">{product.name}</span>
                            {product.variants && product.variants.length > 0 && (
                              <span className="kd-avail-product-meta">
                                {product.variants.map((v) => `${v.name} ₹${v.price}`).join(' · ')}
                              </span>
                            )}
                          </div>
                          <div className="kd-avail-row-right">
                            <span className={`kd-avail-label${isAvailable ? ' kd-avail-label--on' : ' kd-avail-label--off'}`}>
                              {isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                            <button
                              className={`kd-toggle${isAvailable ? ' kd-toggle--on' : ' kd-toggle--off'}`}
                              onClick={() => handleToggle(product._id, product.name, product.availability)}
                              disabled={isToggling}
                              aria-label={`Toggle ${product.name} availability`}
                              id={`avail-toggle-${product._id}`}
                            >
                              <span className="kd-toggle__thumb" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
