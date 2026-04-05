import { useState, useEffect, useCallback, useRef } from 'react';
import { getTables, getSession } from '../services/cashierService';
import { getPendingOrders, approveOrder, rejectOrder } from '../services/orderService';
import TableList from '../components/cashier/TableList';
import SessionDetails from '../components/cashier/SessionDetails';
import PaymentPanel from '../components/cashier/PaymentPanel';
import { CreditCard, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 10000;

export default function CashierScreen() {
  // ── Cashier session state ────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cashback redemption state: { [mobile]: amountToRedeem }
  const [cashbackRedemptions, setCashbackRedemptions] = useState({});

  // ── Pending orders state (booking-conflict orders only) ──────────────────
  const [pendingOrders, setPendingOrders] = useState([]);
  const [actioning, setActioning] = useState(null);

  const pollRef = useRef(null);
  const pendingPollRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  // ── Data fetchers ────────────────────────────────────────────────────────
  const fetchTables = useCallback(async (silent = false) => {
    if (!silent) setLoadingTables(true);
    else setRefreshing(true);
    try {
      const res = await getTables();
      const data = res.data.data || [];
      setSessions(data);
      if (selectedIdRef.current && !data.some((s) => s.sessionId === selectedIdRef.current)) {
        setSelectedId(null);
        setSessionDetail(null);
        setCashbackRedemptions({});
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load cashier tables');
    } finally {
      setLoadingTables(false);
      setRefreshing(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const res = await getPendingOrders();
      setPendingOrders(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTables();
    fetchPending();
    pollRef.current        = setInterval(() => fetchTables(true), POLL_INTERVAL);
    pendingPollRef.current = setInterval(fetchPending,            POLL_INTERVAL);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(pendingPollRef.current);
    };
  }, [fetchTables, fetchPending]);

  const fetchSessionDetail = useCallback(async (sessionId) => {
    setLoadingDetail(true);
    try {
      const res = await getSession(sessionId);
      setSessionDetail(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load session';
      toast.error(msg);
      setSessionDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectTable = (sessionId) => {
    setSelectedId(sessionId);
    setCashbackRedemptions({});
    fetchSessionDetail(sessionId);
  };

  const handlePaymentComplete = () => {
    setSelectedId(null);
    setSessionDetail(null);
    setCashbackRedemptions({});
    fetchTables();
  };

  const handleRedemptionChange = (mobile, amountToRedeem) => {
    setCashbackRedemptions((prev) => {
      const updated = { ...prev };
      if (amountToRedeem == null || amountToRedeem <= 0) {
        delete updated[mobile];
      } else {
        updated[mobile] = amountToRedeem;
      }
      return updated;
    });
  };

  const handleApprove = async (orderId) => {
    setActioning(orderId);
    try {
      await approveOrder(orderId);
      toast.success('Order approved — sent to kitchen');
      fetchPending();
      fetchTables();
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
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setActioning(null);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const redemptionsArray = Object.entries(cashbackRedemptions).map(([mobile, amountToRedeem]) => ({
    mobile,
    amountToRedeem,
  }));

  const orders = sessionDetail?.orders || [];
  const allPrepared = orders.length > 0 && orders.every((o) => o.status === 'PREPARED');
  const grandTotal = sessionDetail?.grandTotal || 0;

  const totalCashApplied = Object.values(cashbackRedemptions).reduce((s, v) => s + (v || 0), 0);
  const effectiveGrandTotal = parseFloat(Math.max(0, grandTotal - totalCashApplied).toFixed(2));

  const sessionIdForPayment = sessionDetail?.session?._id ?? null;

  return (
    <div className="cs-page" id="cashier-screen">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="cs-header-row">
          <div>
            <h1 className="page-title">
              <CreditCard size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              Cashier Terminal
            </h1>
            <p className="page-subtitle">Review conflict orders, manage payments and close sessions</p>
          </div>
          <button
            className={`btn btn-secondary btn-sm cs-refresh-btn${refreshing ? ' cs-refresh-btn--spin' : ''}`}
            onClick={() => fetchTables(true)}
            disabled={refreshing}
            id="cashier-refresh-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Pending Orders (booking-conflict) banner ─────────────────────── */}
      {pendingOrders.length > 0 && (
        <div className="cs-pending-section" id="cashier-pending-orders">
          <div className="cs-pending-header">
            <AlertTriangle size={16} className="cs-pending-icon" />
            <span className="cs-pending-title">
              Booking Conflict — {pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} awaiting review
            </span>
          </div>

          <div className="cs-pending-list">
            {pendingOrders.map((order) => (
              <div
                key={order._id}
                className="cs-pending-card"
                id={`cashier-pending-${order._id}`}
              >
                {/* Warning stripe */}
                {order.bookingWarning && (
                  <div className="cs-pending-warning" role="alert">
                    <span className="cs-pending-warning__icon">⚠️</span>
                    <span className="cs-pending-warning__text">{order.bookingWarning}</span>
                  </div>
                )}

                {/* Order details row */}
                <div className="cs-pending-body">
                  <div className="cs-pending-info">
                    <div className="cs-pending-table">
                      Table {order.table?.tableNumber ?? '—'}
                      <span className="cs-pending-customer"> · {order.customerName}</span>
                    </div>
                    <div className="cs-pending-items">
                      {order.items.map((it, i) => (
                        <span key={i}>
                          {it.name}
                          {it.variant?.name ? ` (${it.variant.name})` : ''} ×{it.quantity}
                          {i < order.items.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                    <div className="cs-pending-total">₹{order.totalAmount}</div>
                  </div>

                  <div className="cs-pending-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApprove(order._id)}
                      disabled={actioning === order._id}
                      id={`cashier-approve-${order._id}`}
                    >
                      <CheckCircle size={14} />
                      {actioning === order._id ? '…' : 'Approve → Kitchen'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleReject(order._id)}
                      disabled={actioning === order._id}
                      id={`cashier-reject-${order._id}`}
                      style={{ color: 'var(--danger)' }}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Session / payment split layout ────────────────────────────────── */}
      <div className="cs-layout">
        {/* Left: Table list */}
        <div className="cs-sidebar">
          <div className="cs-sidebar__header">
            <span className="cs-sidebar__title">Occupied Tables</span>
            <span className="cs-sidebar__count">{sessions.length}</span>
          </div>
          <TableList
            sessions={sessions}
            selectedId={selectedId}
            onSelect={handleSelectTable}
            loading={loadingTables}
          />
        </div>

        {/* Right: Session details + Payment */}
        <div className="cs-main">
          <SessionDetails
            detail={sessionDetail}
            loading={loadingDetail}
            cashbackRedemptions={cashbackRedemptions}
            onRedemptionChange={handleRedemptionChange}
          />

          {sessionDetail && sessionIdForPayment && (
            <PaymentPanel
              sessionId={sessionIdForPayment}
              totalAmount={effectiveGrandTotal}
              originalTotal={grandTotal}
              cashbackApplied={totalCashApplied}
              allPrepared={allPrepared}
              cashbackRedemptions={redemptionsArray}
              onPaymentComplete={handlePaymentComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
