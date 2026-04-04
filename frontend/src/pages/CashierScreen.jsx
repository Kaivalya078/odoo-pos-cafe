import { useState, useEffect, useCallback, useRef } from 'react';
import { getTables, getSession } from '../services/cashierService';
import TableList from '../components/cashier/TableList';
import SessionDetails from '../components/cashier/SessionDetails';
import PaymentPanel from '../components/cashier/PaymentPanel';
import { CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 8000;

export default function CashierScreen() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  // Use a ref to track selectedId inside polling without adding it to useCallback deps.
  // This prevents the interval from being torn down and recreated on every selection.
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  // ── Fetch table list ────────────────────────────────────────────────────────
  const fetchTables = useCallback(async (silent = false) => {
    if (!silent) setLoadingTables(true);
    else setRefreshing(true);
    try {
      const res = await getTables();
      const data = res.data.data || [];
      setSessions(data);

      // If the currently-selected session has been paid/closed,
      // clear it. Use the ref so this callback stays stable.
      if (selectedIdRef.current && !data.some((s) => s.sessionId === selectedIdRef.current)) {
        setSelectedId(null);
        setSessionDetail(null);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load cashier tables');
    } finally {
      setLoadingTables(false);
      setRefreshing(false);
    }
  }, []); // stable — no deps that change

  // Initial fetch + polling (runs only once since fetchTables is stable)
  useEffect(() => {
    fetchTables();
    pollRef.current = setInterval(() => fetchTables(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchTables]);

  // ── Fetch session details on selection ──────────────────────────────────────
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

  const handleSelectTable = (sessionId) => {
    setSelectedId(sessionId);
    fetchSessionDetail(sessionId);
  };

  // ── Payment completed — refresh everything ─────────────────────────────────
  const handlePaymentComplete = () => {
    setSelectedId(null);
    setSessionDetail(null);
    fetchTables();
  };

  // ── Derive values from sessionDetail (authoritative from backend) ──────────
  const orders = sessionDetail?.orders || [];
  const allPrepared = orders.length > 0 && orders.every((o) => o.status === 'PREPARED');
  const totalAmount = sessionDetail?.totalAmount || 0;

  // Use the session's own _id from the loaded data — NOT selectedId.
  // This guarantees the payment call always uses a real ObjectId, even if
  // the UI selection state somehow lags behind.
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
            <p className="page-subtitle">Manage payments and close sessions</p>
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

      {/* Split layout */}
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
          <SessionDetails detail={sessionDetail} loading={loadingDetail} />

          {sessionDetail && sessionIdForPayment && (
            <PaymentPanel
              sessionId={sessionIdForPayment}
              totalAmount={totalAmount}
              allPrepared={allPrepared}
              onPaymentComplete={handlePaymentComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
