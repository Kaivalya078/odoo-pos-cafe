import { useState, useEffect, useCallback, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { getAllFloors } from '../services/floorService';
import { getTablesByFloor } from '../services/tableService';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { getPendingOrders, approveOrder, rejectOrder } from '../services/orderService';
import { getSummary, getOrderHistory, getSessionHistory, getTopProducts } from '../services/analyticsService';
import {
  Settings, Package, ClipboardList, CheckCircle, XCircle,
  BarChart3, Calendar, Search, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import FloorList from '../components/FloorList';
import TableGrid from '../components/TableGrid';
import AddTableForm from '../components/AddTableForm';
import AddProductForm from '../components/AddProductForm';
import ProductList from '../components/ProductList';
import SummaryCards from '../components/analytics/SummaryCards';
import OrdersTable from '../components/analytics/OrdersTable';
import SessionsTable from '../components/analytics/SessionsTable';
import TopProducts from '../components/analytics/TopProducts';

export default function AdminPanel() {
  const { status, toggleStatus } = useRestaurant();
  const [toggling, setToggling] = useState(false);

  // Pending orders state
  const [pendingOrders, setPendingOrders] = useState([]);
  const [actioning, setActioning] = useState(null);
  const pollRef = useRef(null);

  // Floor state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Table state
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Product state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

  // ── Analytics state ─────────────────────────────────────────────────────────
  const [summaryData, setSummaryData] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingTopProducts, setLoadingTopProducts] = useState(true);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  // Fetch pending orders
  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await getPendingOrders();
      setPendingOrders(res.data.data);
    } catch {
      // silently fail on poll errors
    }
  }, []);

  // Fetch all floors
  const fetchFloors = useCallback(async () => {
    try {
      const res = await getAllFloors();
      setFloors(res.data.data);
    } catch (err) {
      toast.error('Failed to load floors');
    }
  }, []);

  // Fetch tables for selected floor
  const fetchTables = useCallback(async (floorId) => {
    setLoadingTables(true);
    try {
      const res = await getTablesByFloor(floorId);
      setTables(res.data.data);
    } catch (err) {
      toast.error('Failed to load tables');
    } finally {
      setLoadingTables(false);
    }
  }, []);

  // Fetch all products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await getAllProducts();
      setProducts(res.data.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // ── Analytics fetchers ──────────────────────────────────────────────────────
  const fetchSummary = useCallback(async (startDate, endDate) => {
    setLoadingSummary(true);
    try {
      const res = await getSummary(startDate || undefined, endDate || undefined);
      setSummaryData(res.data.data);
    } catch {
      toast.error('Failed to load summary');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchOrderHistory = useCallback(async (startDate, endDate) => {
    setLoadingOrders(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getOrderHistory(params);
      setOrderHistory(res.data.data);
    } catch {
      toast.error('Failed to load order history');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchSessionHistory = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await getSessionHistory();
      setSessionHistory(res.data.data);
    } catch {
      toast.error('Failed to load session history');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetchTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    try {
      const res = await getTopProducts();
      setTopProductsData(res.data.data);
    } catch {
      toast.error('Failed to load top products');
    } finally {
      setLoadingTopProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchFloors();
    fetchProducts();
    fetchPendingOrders();
    // Poll every 10s for new orders
    pollRef.current = setInterval(fetchPendingOrders, 10000);

    // Fetch analytics on mount
    fetchSummary();
    fetchOrderHistory();
    fetchSessionHistory();
    fetchTopProducts();

    return () => clearInterval(pollRef.current);
  }, [fetchFloors, fetchProducts, fetchPendingOrders, fetchSummary, fetchOrderHistory, fetchSessionHistory, fetchTopProducts]);

  // Refetch tables when selected floor changes
  useEffect(() => {
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    } else {
      setTables([]);
    }
  }, [selectedFloor, fetchTables]);

  // ── Filter handler ──────────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    fetchSummary(filterStart, filterEnd);
    fetchOrderHistory(filterStart, filterEnd);
  };

  const handleClearFilters = () => {
    setFilterStart('');
    setFilterEnd('');
    fetchSummary();
    fetchOrderHistory();
  };

  // Order approve / reject
  const handleApprove = async (orderId) => {
    setActioning(orderId);
    try {
      await approveOrder(orderId);
      toast.success('Order approved — table marked occupied');
      fetchPendingOrders();
      if (selectedFloor) fetchTables(selectedFloor._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve order');
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (orderId) => {
    setActioning(orderId);
    try {
      await rejectOrder(orderId);
      toast.success('Order rejected');
      fetchPendingOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setActioning(null);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const data = await toggleStatus();
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  const handleFloorCreated = () => {
    fetchFloors();
  };

  const handleTableCreated = () => {
    fetchFloors();
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    }
  };

  const handleTableDeleted = () => {
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    }
  };

  // --- Product handlers ---
  const handleProductSubmit = async (payload, productId) => {
    try {
      if (productId) {
        await updateProduct(productId, payload);
        toast.success('Product updated');
        setEditingProduct(null);
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleProductEdit = (product) => {
    setEditingProduct(product);
    // Scroll to form
    document.getElementById('product-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleProductDelete = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await deleteProduct(productId);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  // Product stats
  const categories = [...new Set(products.map((p) => p.category))];
  const availableCount = products.filter((p) => p.availability === 'AVAILABLE').length;
  const unavailableCount = products.filter((p) => p.availability === 'UNAVAILABLE').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage restaurant status, floors, tables and products</p>
      </div>

      {/* ── Pending Orders ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">
          <ClipboardList size={16} />
          Pending Orders
          {pendingOrders.length > 0 && (
            <span style={{
              marginLeft: 8, background: 'var(--accent)', color: '#fff',
              borderRadius: 999, fontSize: 11, padding: '1px 8px', fontWeight: 700,
            }}>{pendingOrders.length}</span>
          )}
        </div>

        {pendingOrders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No pending orders right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingOrders.map((order) => (
              <div key={order._id} style={{
                background: 'var(--surface)', borderRadius: 8, padding: '12px 16px',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start',
                gap: 16, flexWrap: 'wrap',
              }}>
                {/* Order info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Table {order.table?.tableNumber ?? '—'}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 13 }}>
                      · {order.customerName}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {order.items.map((it, i) => (
                      <span key={i}>
                        {it.name}{it.variant?.name ? ` (${it.variant.name})` : ''} ×{it.quantity}
                        {i < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>₹{order.totalAmount}</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprove(order._id)}
                    disabled={actioning === order._id}
                    id={`approve-order-${order._id}`}
                  >
                    <CheckCircle size={14} />
                    {actioning === order._id ? '…' : 'Approve'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleReject(order._id)}
                    disabled={actioning === order._id}
                    id={`reject-order-${order._id}`}
                    style={{ color: 'var(--error, #e55)' }}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restaurant Status */}
      <div className="card">
        <div className="card-title">
          <Settings size={16} />
          Restaurant Status
        </div>
        <div className="status-row">
          <div className="status-info">
            <span className="status-label">Current state:</span>
            <span className={`status-badge status-badge--${status === 'OPEN' ? 'open' : 'closed'}`}>
              <span className="status-dot" />
              {status || '…'}
            </span>
          </div>
          <button
            className={`btn-toggle btn-toggle--${status === 'OPEN' ? 'open' : 'closed'}`}
            onClick={handleToggle}
            disabled={toggling}
            id="admin-toggle-status"
          >
            {toggling ? 'Updating…' : status === 'OPEN' ? 'Close Restaurant' : 'Open Restaurant'}
          </button>
        </div>
      </div>

      {/* Floor Management */}
      <FloorList
        floors={floors}
        selectedFloor={selectedFloor}
        onSelectFloor={setSelectedFloor}
        onFloorCreated={handleFloorCreated}
      />

      {/* Add Table Form */}
      <AddTableForm
        floors={floors}
        onTableCreated={handleTableCreated}
      />

      {/* Table Grid */}
      <TableGrid
        tables={tables}
        selectedFloor={selectedFloor}
        loading={loadingTables}
        onTableDeleted={handleTableDeleted}
        onTableUpdated={handleTableDeleted}
      />

      {/* ── Product Management Section ──────────────────────────────────────── */}
      <div className="section-divider" />

      <div className="page-header">
        <h2 className="page-title" style={{ fontSize: 18 }}>
          <Package size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Product Management
        </h2>
        <p className="page-subtitle">Create, edit and manage your menu products</p>
      </div>

      {/* Product Stats */}
      <div className="stat-row">
        <div className="stat-item">
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{availableCount}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{unavailableCount}</div>
          <div className="stat-label">Unavailable</div>
        </div>
      </div>

      {/* Add / Edit Product Form */}
      <AddProductForm
        onSubmit={handleProductSubmit}
        editingProduct={editingProduct}
        onCancelEdit={() => setEditingProduct(null)}
      />

      {/* Product List */}
      <ProductList
        products={products}
        loading={loadingProducts}
        onEdit={handleProductEdit}
        onDelete={handleProductDelete}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          ANALYTICS DASHBOARD
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="section-divider" />

      <div className="page-header">
        <h2 className="page-title" style={{ fontSize: 18 }}>
          <BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Analytics Dashboard
        </h2>
        <p className="page-subtitle">Revenue, orders, and product performance</p>
      </div>

      {/* Date Filters */}
      <div className="an-filter-bar" id="analytics-filters">
        <div className="an-filter-group">
          <Calendar size={14} />
          <label className="an-filter-label">From</label>
          <input
            type="date"
            className="form-input an-filter-input"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
            id="analytics-filter-start"
          />
        </div>
        <div className="an-filter-group">
          <Calendar size={14} />
          <label className="an-filter-label">To</label>
          <input
            type="date"
            className="form-input an-filter-input"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
            id="analytics-filter-end"
          />
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleApplyFilters}
          id="analytics-apply-filter"
        >
          <Search size={14} />
          Apply
        </button>
        {(filterStart || filterEnd) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleClearFilters}
            id="analytics-clear-filter"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards data={summaryData} loading={loadingSummary} />

      {/* Top Products + Order History grid */}
      <div className="an-grid-2">
        <div className="card">
          <div className="card-title">🏆 Top Products</div>
          <TopProducts products={topProductsData} loading={loadingTopProducts} />
        </div>

        <div className="card">
          <div className="card-title">📋 Session History</div>
          <SessionsTable sessions={sessionHistory} loading={loadingSessions} />
        </div>
      </div>

      {/* Order History */}
      <div className="card">
        <div className="card-title">📦 Order History</div>
        <OrdersTable orders={orderHistory} loading={loadingOrders} />
      </div>
    </div>
  );
}
