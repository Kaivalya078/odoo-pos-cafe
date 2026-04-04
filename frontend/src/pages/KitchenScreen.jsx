import { useState, useEffect, useCallback, useRef } from 'react';
import { getKitchenOrders, updateItemPrepared } from '../services/kitchenService';
import OrderCard from '../components/kitchen/OrderCard';
import { ChefHat, Search, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'APPROVED', label: 'To Cook' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'PREPARED', label: 'Completed' },
];

const POLL_INTERVAL = 5000; // 5 seconds

export default function KitchenScreen() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getKitchenOrders();
      // Normalize items: ensure _id and preparedQuantity exist
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

  // ── Item preparation handler ─────────────────────────────────────────────
  const handlePrepare = async (orderId, itemId) => {
    // Guard: fallback IDs can't be used for PATCH
    if (itemId.startsWith('fallback-')) {
      toast.error('Item ID missing from backend — cannot update preparation');
      return;
    }
    try {
      const res = await updateItemPrepared(orderId, itemId);
      const raw = res.data.data;
      // Normalize the PATCH response too
      const updatedOrder = {
        ...raw,
        items: (raw.items || []).map((item, idx) => ({
          ...item,
          _id: item._id || `fallback-${raw._id}-${idx}`,
          preparedQuantity: item.preparedQuantity ?? 0,
        })),
      };

      // Replace the updated order in state (backend is source of truth)
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update item';
      toast.error(msg);
      // Refetch to re-sync on error
      fetchOrders(true);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (activeTab !== 'ALL' && order.status !== activeTab) return false;

    // Search filter (match item names)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesItem = order.items.some((item) =>
        item.name.toLowerCase().includes(q)
      );
      const matchesCustomer = order.customerName?.toLowerCase().includes(q);
      const matchesTicket = order._id.slice(-4).toLowerCase().includes(q);
      if (!matchesItem && !matchesCustomer && !matchesTicket) return false;
    }

    return true;
  });

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = {
    ALL: orders.length,
    APPROVED: orders.filter((o) => o.status === 'APPROVED').length,
    PREPARING: orders.filter((o) => o.status === 'PREPARING').length,
    PREPARED: orders.filter((o) => o.status === 'PREPARED').length,
  };

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

      {/* Toolbar: Tabs + Search */}
      <div className="kd-toolbar">
        <div className="kd-tabs">
          {TABS.map((tab) => (
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
                : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} orders`}
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
    </div>
  );
}
