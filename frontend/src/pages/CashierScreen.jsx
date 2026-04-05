import { useState, useEffect, useCallback, useRef } from 'react';
import { getTables, getSession } from '../services/cashierService';
import TableList from '../components/cashier/TableList';
import SessionDetails from '../components/cashier/SessionDetails';
import PaymentPanel from '../components/cashier/PaymentPanel';
import { CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 10000;

export default function CashierScreen() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cashback redemption state: { [mobile]: amountToRedeem }
  const [cashbackRedemptions, setCashbackRedemptions] = useState({});

  const pollRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

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

  useEffect(() => {
    fetchTables();
    pollRef.current = setInterval(() => fetchTables(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchTables]);

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
    setCashbackRedemptions({}); // Reset cashback on new selection
    fetchSessionDetail(sessionId);
  };

  const handlePaymentComplete = () => {
    setSelectedId(null);
    setSessionDetail(null);
    setCashbackRedemptions({});
    fetchTables();
  };

  // Cashback redemption toggle from SessionDetails
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

  // Build redemptions array for payment API
  const redemptionsArray = Object.entries(cashbackRedemptions).map(([mobile, amountToRedeem]) => ({
    mobile,
    amountToRedeem,
  }));

  const orders = sessionDetail?.orders || [];
  const allPrepared = orders.length > 0 && orders.every((o) => o.status === 'PREPARED');
  const grandTotal = sessionDetail?.grandTotal || 0;

  // Effective total after cashback
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
