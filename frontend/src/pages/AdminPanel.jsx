import { useState, useEffect, useCallback, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { getAllFloors } from '../services/floorService';
import { getTablesByFloor } from '../services/tableService';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { getPendingOrders, approveOrder, rejectOrder } from '../services/orderService';
import { getSummary, getOrderHistory, getSessionHistory, getTopProducts } from '../services/analyticsService';
import { getBookings, cancelBooking, completeBooking } from '../services/bookingService';
import { updateHours } from '../services/restaurantService';
import {
  Settings, Package, ClipboardList, CheckCircle, XCircle,
  BarChart3, Calendar, Search, X, CalendarDays, Clock, Phone, User,
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
import WarningBanner from '../components/WarningBanner';

const TABS = [
  { key: 'orders',    label: 'Orders',    icon: ClipboardList },
  { key: 'products',  label: 'Products',  icon: Package },
  { key: 'tables',    label: 'Tables',    icon: Settings },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'bookings',  label: 'Bookings',  icon: CalendarDays },
];

export default function AdminPanel() {
  const { status, lastSession, toggleStatus } = useRestaurant();
  const [activeTab, setActiveTab] = useState('orders');
  const [toggling, setToggling] = useState(false);

  const [pendingOrders, setPendingOrders] = useState([]);
  const [actioning, setActioning] = useState(null);
  const ordersIntervalRef = useRef(null);
  const productsIntervalRef = useRef(null);
  const bookingsIntervalRef = useRef(null);

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

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

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingActioning, setBookingActioning] = useState(null);

  const [openingHour, setOpeningHour] = useState(9);
  const [closingHour, setClosingHour] = useState(22);
  const [savingHours, setSavingHours] = useState(false);

  const fetchPendingOrders = useCallback(async () => {
    try { const res = await getPendingOrders(); setPendingOrders(res.data.data); } catch {}
  }, []);

  const fetchFloors = useCallback(async () => {
    try { const res = await getAllFloors(); setFloors(res.data.data); }
    catch { toast.error('Failed to load floors'); }
  }, []);

  const fetchTables = useCallback(async (floorId) => {
    setLoadingTables(true);
    try { const res = await getTablesByFloor(floorId); setTables(res.data.data); }
    catch { toast.error('Failed to load tables'); }
    finally { setLoadingTables(false); }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try { const res = await getAllProducts(); setProducts(res.data.data); }
    catch { toast.error('Failed to load products'); }
    finally { setLoadingProducts(false); }
  }, []);

  const fetchSummary = useCallback(async (startDate, endDate) => {
    setLoadingSummary(true);
    try { const res = await getSummary(startDate || undefined, endDate || undefined); setSummaryData(res.data.data); }
    catch { toast.error('Failed to load summary'); }
    finally { setLoadingSummary(false); }
  }, []);

  const fetchOrderHistory = useCallback(async (startDate, endDate) => {
    setLoadingOrders(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getOrderHistory(params);
      setOrderHistory(res.data.data);
    } catch { toast.error('Failed to load order history'); }
    finally { setLoadingOrders(false); }
  }, []);

  const fetchSessionHistory = useCallback(async () => {
    setLoadingSessions(true);
    try { const res = await getSessionHistory(); setSessionHistory(res.data.data); }
    catch { toast.error('Failed to load session history'); }
    finally { setLoadingSessions(false); }
  }, []);

  const fetchTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    try { const res = await getTopProducts(); setTopProductsData(res.data.data); }
    catch { toast.error('Failed to load top products'); }
    finally { setLoadingTopProducts(false); }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try { const res = await getBookings(); setBookings(res.data.data); }
    catch { toast.error('Failed to load bookings'); }
    finally { setLoadingBookings(false); }
  }, []);

  const handleCancelBooking = async (id) => {
    setBookingActioning(id);
    try { await cancelBooking(id); toast.success('Booking cancelled'); fetchBookings(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel booking'); }
    finally { setBookingActioning(null); }
  };

  const handleCompleteBooking = async (id) => {
    setBookingActioning(id);
    try { await completeBooking(id); toast.success('Booking completed'); fetchBookings(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to complete booking'); }
    finally { setBookingActioning(null); }
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try { await updateHours(Number(openingHour), Number(closingHour)); toast.success('Operating hours updated'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update hours'); }
    finally { setSavingHours(false); }
  };

  useEffect(() => {
    // Initial load of all data
    fetchFloors();
    fetchProducts();
    fetchPendingOrders();
    fetchBookings();
    fetchSummary();
    fetchOrderHistory();
    fetchSessionHistory();
    fetchTopProducts();

    // Poll the live-data endpoints every 10 s
    ordersIntervalRef.current   = setInterval(fetchPendingOrders, 10_000);
    productsIntervalRef.current = setInterval(fetchProducts,      10_000);
    bookingsIntervalRef.current = setInterval(fetchBookings,      10_000);

    return () => {
      clearInterval(ordersIntervalRef.current);
      clearInterval(productsIntervalRef.current);
      clearInterval(bookingsIntervalRef.current);
    };
  }, [fetchFloors, fetchProducts, fetchPendingOrders, fetchSummary, fetchOrderHistory, fetchSessionHistory, fetchTopProducts, fetchBookings]);

  useEffect(() => {
    if (selectedFloor) fetchTables(selectedFloor._id); else setTables([]);
  }, [selectedFloor, fetchTables]);

  const handleApplyFilters = () => { fetchSummary(filterStart, filterEnd); fetchOrderHistory(filterStart, filterEnd); };
  const handleClearFilters = () => { setFilterStart(''); setFilterEnd(''); fetchSummary(); fetchOrderHistory(); };

  const handleApprove = async (orderId) => {
    setActioning(orderId);
    try { await approveOrder(orderId); toast.success('Order approved — table marked occupied'); fetchPendingOrders(); if (selectedFloor) fetchTables(selectedFloor._id); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to approve order'); }
    finally { setActioning(null); }
  };

  const handleReject = async (orderId) => {
    setActioning(orderId);
    try { await rejectOrder(orderId); toast.success('Order rejected'); fetchPendingOrders(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to reject order'); }
    finally { setActioning(null); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try { const data = await toggleStatus(); toast.success(data.message); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to toggle status'); }
    finally { setToggling(false); }
  };

  const handleProductSubmit = async (payload, productId) => {
    try {
      if (productId) { await updateProduct(productId, payload); toast.success('Product updated'); setEditingProduct(null); }
      else { await createProduct(payload); toast.success('Product created'); }
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save product'); }
  };

  const handleProductEdit = (product) => {
    setEditingProduct(product);
    document.getElementById('product-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleProductDelete = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try { await deleteProduct(productId); toast.success('Product deleted'); fetchProducts(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete product'); }
  };

  const categories = [...new Set(products.map((p) => p.category))];
  const availableCount = products.filter((p) => p.availability === 'AVAILABLE').length;
  const unavailableCount = products.filter((p) => p.availability === 'UNAVAILABLE').length;

  return (
    <div className="admin-panel">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage restaurant status, floors, tables and products</p>
      </div>

      {/* Tab Bar */}
      <div className="admin-tabs" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = tab.key === 'orders' && pendingOrders.length > 0 ? pendingOrders.length : null;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`admin-tab${activeTab === tab.key ? ' admin-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              id={`admin-tab-${tab.key}`}
            >
              <Icon size={15} />
              {tab.label}
              {badge && <span className="admin-tab-badge">{badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <div className="admin-tab-content">
          {/* Restaurant Status */}
          <div className="card">
            <div className="card-title"><Settings size={16} />Restaurant Status</div>
            <div className="status-row">
              <div className="status-info">
                <span className="status-label">Current state:</span>
                <span className={`status-badge status-badge--${status === 'OPEN' ? 'open' : 'closed'}`}>
                  <span className="status-dot" />{status || '…'}
                </span>
              </div>
              <button
                className={`btn-toggle btn-toggle--${status === 'OPEN' ? 'open' : 'closed'}`}
                onClick={handleToggle} disabled={toggling} id="admin-toggle-status"
              >
                {toggling ? 'Updating…' : status === 'OPEN' ? 'Close Restaurant' : 'Open Restaurant'}
              </button>
            </div>
            {status === 'CLOSED' && lastSession && lastSession.lastClosedAt && (
              <div className="last-session-summary">
                <div className="last-session-title">Last Session Summary</div>
                <div className="last-session-grid">
                  <div className="last-session-item">
                    <div className="last-session-label">🟢 Opened</div>
                    <div className="last-session-value">
                      {lastSession.lastOpenedAt
                        ? new Date(lastSession.lastOpenedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                        : '—'}
                    </div>
                  </div>
                  <div className="last-session-item">
                    <div className="last-session-label">🔴 Closed</div>
                    <div className="last-session-value">
                      {new Date(lastSession.lastClosedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  <div className="last-session-item last-session-item--highlight">
                    <div className="last-session-label">💰 Revenue</div>
                    <div className="last-session-value last-session-revenue">₹{(lastSession.totalRevenue || 0).toFixed(2)}</div>
                  </div>
                  <div className="last-session-item">
                    <div className="last-session-label">📦 Orders</div>
                    <div className="last-session-value">{lastSession.totalOrders ?? 0} paid orders</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="card">
            <div className="card-title">
              <ClipboardList size={16} />Pending Orders
              {pendingOrders.length > 0 && (
                <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 8px', fontWeight: 700 }}>
                  {pendingOrders.length}
                </span>
              )}
            </div>
            {pendingOrders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No pending orders right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingOrders.map((order) => (
                  <div key={order._id} style={{ background: 'var(--bg-elevated)', borderRadius: 8, border: order.bookingWarning ? '1px solid rgba(251,191,36,0.35)' : '1px solid var(--border-default)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', padding: '12px 16px' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Table {order.table?.tableNumber ?? '—'}
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 13 }}>· {order.customerName}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                          {order.items.map((it, i) => (
                            <span key={i}>{it.name}{it.variant?.name ? ` (${it.variant.name})` : ''} ×{it.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>
                          ))}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>₹{order.totalAmount}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(order._id)} disabled={actioning === order._id} id={`approve-order-${order._id}`}>
                          <CheckCircle size={14} />{actioning === order._id ? '…' : 'Approve'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleReject(order._id)} disabled={actioning === order._id} id={`reject-order-${order._id}`} style={{ color: 'var(--danger)' }}>
                          <XCircle size={14} />Reject
                        </button>
                      </div>
                    </div>
                    {order.bookingWarning && (
                      <div id={`booking-warning-${order._id}`} role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', background: 'rgba(251,191,36,0.08)', borderTop: '1px solid rgba(251,191,36,0.22)' }}>
                        <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
                        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: '#fbbf24', fontWeight: 500 }}>{order.bookingWarning}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <div className="admin-tab-content">
          <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="page-title" style={{ fontSize: 18 }}><Package size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Product Management</h2>
            <p className="page-subtitle">Create, edit and manage your menu products</p>
          </div>
          <div className="stat-row">
            <div className="stat-item"><div className="stat-value">{products.length}</div><div className="stat-label">Total Products</div></div>
            <div className="stat-item"><div className="stat-value">{categories.length}</div><div className="stat-label">Categories</div></div>
            <div className="stat-item"><div className="stat-value">{availableCount}</div><div className="stat-label">Available</div></div>
            <div className="stat-item"><div className="stat-value">{unavailableCount}</div><div className="stat-label">Unavailable</div></div>
          </div>
          <AddProductForm onSubmit={handleProductSubmit} editingProduct={editingProduct} onCancelEdit={() => setEditingProduct(null)} />
          <ProductList products={products} loading={loadingProducts} onEdit={handleProductEdit} onDelete={handleProductDelete} />
        </div>
      )}

      {/* ── TABLES TAB ── */}
      {activeTab === 'tables' && (
        <div className="admin-tab-content">
          <FloorList floors={floors} selectedFloor={selectedFloor} onSelectFloor={setSelectedFloor} onFloorCreated={fetchFloors} />
          <AddTableForm floors={floors} onTableCreated={() => { fetchFloors(); if (selectedFloor) fetchTables(selectedFloor._id); }} />
          <TableGrid tables={tables} selectedFloor={selectedFloor} loading={loadingTables} onTableDeleted={() => { if (selectedFloor) fetchTables(selectedFloor._id); }} onTableUpdated={() => { if (selectedFloor) fetchTables(selectedFloor._id); }} />
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && (
        <div className="admin-tab-content">
          <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="page-title" style={{ fontSize: 18 }}><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Analytics Dashboard</h2>
            <p className="page-subtitle">Revenue, orders, and product performance</p>
          </div>
          <div className="an-filter-bar" id="analytics-filters">
            <div className="an-filter-group"><Calendar size={14} /><label className="an-filter-label">From</label><input type="date" className="form-input an-filter-input" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} id="analytics-filter-start" /></div>
            <div className="an-filter-group"><Calendar size={14} /><label className="an-filter-label">To</label><input type="date" className="form-input an-filter-input" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} id="analytics-filter-end" /></div>
            <button className="btn btn-primary btn-sm" onClick={handleApplyFilters} id="analytics-apply-filter"><Search size={14} />Apply</button>
            {(filterStart || filterEnd) && (<button className="btn btn-secondary btn-sm" onClick={handleClearFilters} id="analytics-clear-filter"><X size={14} />Clear</button>)}
          </div>
          <SummaryCards data={summaryData} loading={loadingSummary} />
          <div className="an-grid-2">
            <div className="card"><div className="card-title">🏆 Top Products</div><TopProducts products={topProductsData} loading={loadingTopProducts} /></div>
            <div className="card"><div className="card-title">📋 Session History</div><SessionsTable sessions={sessionHistory} loading={loadingSessions} /></div>
          </div>
          <div className="card"><div className="card-title">📦 Order History</div><OrdersTable orders={orderHistory} loading={loadingOrders} /></div>
        </div>
      )}

      {/* ── BOOKINGS TAB ── */}
      {activeTab === 'bookings' && (
        <div className="admin-tab-content">
          <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="page-title" style={{ fontSize: 18 }}><CalendarDays size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Bookings & Operating Hours</h2>
            <p className="page-subtitle">Manage table reservations and set operating hours</p>
          </div>
          {/* Operating Hours */}
          <div className="card">
            <div className="card-title"><Clock size={16} />Operating Hours</div>
            <div className="bk-hours-row">
              <div className="bk-hours-field">
                <label className="form-label" htmlFor="admin-opening-hour">Opening Hour (24h)</label>
                <input id="admin-opening-hour" type="number" className="form-input" value={openingHour} onChange={(e) => setOpeningHour(e.target.value)} min={0} max={23} style={{ maxWidth: 100 }} />
              </div>
              <div className="bk-hours-field">
                <label className="form-label" htmlFor="admin-closing-hour">Closing Hour (24h)</label>
                <input id="admin-closing-hour" type="number" className="form-input" value={closingHour} onChange={(e) => setClosingHour(e.target.value)} min={1} max={24} style={{ maxWidth: 100 }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleSaveHours} disabled={savingHours} id="admin-save-hours" style={{ alignSelf: 'flex-end' }}>
                {savingHours ? 'Saving…' : 'Save Hours'}
              </button>
            </div>
          </div>
          {/* Bookings List */}
          <div className="card">
            <div className="card-title">
              <CalendarDays size={16} />Bookings
              {bookings.filter((b) => b.status === 'BOOKED').length > 0 && (
                <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 8px', fontWeight: 700 }}>{bookings.filter((b) => b.status === 'BOOKED').length}</span>
              )}
            </div>
            {loadingBookings ? (
              <div className="loading-spinner" style={{ minHeight: 80 }}><div className="spinner" /></div>
            ) : bookings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No bookings found.</p>
            ) : (
              <div className="table-wrap">
                <table className="table" id="admin-bookings-table">
                  <thead><tr><th>Customer</th><th>Phone</th><th>Table</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b._id}>
                        <td style={{ fontWeight: 600 }}><User size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />{b.name}</td>
                        <td style={{ fontSize: 13 }}><Phone size={12} style={{ marginRight: 4 }} />{b.phone}</td>
                        <td><span className="an-table-badge">T{b.table?.tableNumber ?? '—'}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(b.startTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}</td>
                        <td><span className={`bk-status bk-status--${b.status.toLowerCase()}`}>{b.status}</span></td>
                        <td>
                          {b.status === 'BOOKED' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-primary btn-sm" onClick={() => handleCompleteBooking(b._id)} disabled={bookingActioning === b._id}><CheckCircle size={13} />{bookingActioning === b._id ? '…' : 'Complete'}</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleCancelBooking(b._id)} disabled={bookingActioning === b._id} style={{ color: 'var(--danger)' }}><XCircle size={13} />Cancel</button>
                            </div>
                          ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
