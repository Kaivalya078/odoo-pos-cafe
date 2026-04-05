import { useState } from 'react';
import {
  Banknote, CreditCard, Smartphone, CheckCircle,
  Loader2, IndianRupee, ArrowLeft, ShieldCheck, Wallet,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  paySession,
  confirmPayment,
  getRazorpayOrder,
  verifyRazorpayPayment,
} from '../../services/cashierService';
import toast from 'react-hot-toast';

// Load Razorpay checkout.js script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const METHODS = [
  {
    key: 'CASH',
    label: 'Cash',
    icon: Banknote,
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.08)',
    desc: 'Collect cash & confirm',
  },
  {
    key: 'CARD',
    label: 'Card',
    icon: CreditCard,
    color: '#0AABCE',
    bg: 'rgba(10,171,206,0.08)',
    desc: 'Razorpay secure checkout',
  },
  {
    key: 'UPI',
    label: 'UPI',
    icon: Smartphone,
    color: '#E8927C',
    bg: 'rgba(232,146,124,0.08)',
    desc: 'QR scan payment',
  },
];

// totalAmount      — effective total (after cashback)
// originalTotal    — pre-cashback grand total
// cashbackApplied  — total cashback being redeemed
// cashbackRedemptions — array [{ mobile, amountToRedeem }]
export default function PaymentPanel({
  sessionId,
  totalAmount,
  originalTotal,
  cashbackApplied = 0,
  allPrepared,
  cashbackRedemptions = [],
  onPaymentComplete,
}) {
  // 'idle' | 'processing' | 'upi-qr' | 'card-processing'
  const [state, setState] = useState('idle');
  const [processingMethod, setProcessingMethod] = useState(null);
  const [upiData, setUpiData] = useState(null); // { upiUrl, amount }

  const reset = () => { setState('idle'); setProcessingMethod(null); setUpiData(null); };

  // ── CASH handler ──────────────────────────────────────────────────────────
  const handleCash = async () => {
    setState('processing');
    setProcessingMethod('CASH');
    try {
      const res = await paySession(sessionId, 'CASH', cashbackRedemptions);
      toast.success(`Cash payment of ₹${res.data.data.totalPaid?.toFixed(2)} received!`);
      reset();
      onPaymentComplete();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cash payment failed');
      reset();
    }
  };

  // ── UPI handler ───────────────────────────────────────────────────────────
  const handleUpi = async () => {
    setState('processing');
    setProcessingMethod('UPI');
    try {
      const res = await paySession(sessionId, 'UPI', cashbackRedemptions);
      setUpiData({ upiUrl: res.data.data.upiUrl, amount: res.data.data.amount });
      setState('upi-qr');
      setProcessingMethod(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'UPI setup failed');
      reset();
    }
  };

  const handleConfirmUpi = async () => {
    setState('processing');
    setProcessingMethod('UPI');
    try {
      const res = await confirmPayment(sessionId, cashbackRedemptions);
      toast.success(`UPI payment of ₹${res.data.data.totalPaid?.toFixed(2)} confirmed!`);
      reset();
      onPaymentComplete();
    } catch (err) {
      toast.error(err.response?.data?.message || 'UPI confirmation failed');
      setState('upi-qr');
      setProcessingMethod(null);
    }
  };

  // ── CARD / Razorpay handler ───────────────────────────────────────────────
  const handleCard = async () => {
    setState('card-processing');
    setProcessingMethod('CARD');

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay. Check internet connection.');
        reset();
        return;
      }

      const res = await getRazorpayOrder(sessionId);
      const { orderId, amount, currency, key } = res.data.data;

      const options = {
        key,
        amount,
        currency,
        name: 'POS Cafe',
        description: 'Restaurant Bill',
        order_id: orderId,
        theme: { color: '#0AABCE' },
        handler: async (response) => {
          setState('processing');
          try {
            const verifyRes = await verifyRazorpayPayment(sessionId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              cashbackRedemptions,
            });
            toast.success(`Card payment of ₹${verifyRes.data.data.totalPaid?.toFixed(2)} successful!`);
            reset();
            onPaymentComplete();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
            reset();
          }
        },
        modal: {
          ondismiss: () => {
            toast('Card payment cancelled', { icon: 'ℹ️' });
            reset();
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate card payment');
      reset();
    }
  };

  const handleMethod = (key) => {
    if (!allPrepared) { toast.error('All orders must be prepared before payment.'); return; }
    if (key === 'CASH') handleCash();
    else if (key === 'UPI') handleUpi();
    else if (key === 'CARD') handleCard();
  };

  // ── UPI QR View ───────────────────────────────────────────────────────────
  if (state === 'upi-qr' && upiData) {
    return (
      <div className="cs-payment" id="cashier-payment-panel">
        <div className="cs-payment__header">
          <Smartphone size={16} />
          <span>UPI Payment</span>
        </div>

        <div className="cs-payment__qr-container">
          <div className="cs-payment__qr-wrapper">
            <QRCodeSVG
              value={upiData.upiUrl}
              size={200}
              bgColor="#FFFFFF"
              fgColor="#1A1A18"
              level="M"
              includeMargin
            />
          </div>
          <p className="cs-payment__qr-label">Show QR to customer to scan</p>
          <div className="cs-payment__qr-amount">
            <IndianRupee size={18} />
            <span>{upiData.amount.toFixed(2)}</span>
          </div>
          {cashbackApplied > 0 && (
            <div className="cs-payment__cashback-note">
              <Wallet size={12} />
              Includes ₹{cashbackApplied.toFixed(2)} cashback deduction
            </div>
          )}
        </div>

        <div className="cs-payment__qr-actions">
          <button
            className="btn btn-primary cs-payment__confirm-btn"
            onClick={handleConfirmUpi}
            disabled={state === 'processing'}
            id="cashier-confirm-upi-btn"
          >
            {state === 'processing' ? (
              <><Loader2 size={14} className="cs-spin" /> Confirming…</>
            ) : (
              <><CheckCircle size={14} /> Confirm Payment Received</>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={reset}
            disabled={state === 'processing'}
            id="cashier-cancel-upi-btn"
          >
            <ArrowLeft size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Card loading view ─────────────────────────────────────────────────────
  if (state === 'card-processing') {
    return (
      <div className="cs-payment" id="cashier-payment-panel">
        <div className="cs-payment__header">
          <CreditCard size={16} />
          <span>Card Payment</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-md)', padding: 'var(--space-xl) 0', color: 'var(--text-secondary)',
        }}>
          <Loader2 size={32} className="cs-spin" color="var(--accent)" />
          <p style={{ fontWeight: 600 }}>Opening Razorpay Checkout…</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Complete the payment in the popup window
          </p>
        </div>
      </div>
    );
  }

  // ── Default: Method Selection ─────────────────────────────────────────────
  return (
    <div className="cs-payment" id="cashier-payment-panel">
      <div className="cs-payment__header">
        <CreditCard size={16} />
        <span>Payment</span>
        {allPrepared && (
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: 'var(--success)', fontWeight: 600,
          }}>
            <ShieldCheck size={12} /> Ready
          </span>
        )}
      </div>

      {!allPrepared && (
        <div className="cs-payment__blocked">
          Payment locked until all orders are marked prepared by the kitchen.
        </div>
      )}

      <div className="cs-payment__methods">
        {METHODS.map(({ key, label, icon: Icon, color, bg, desc }) => (
          <button
            key={key}
            className="cs-payment__method-btn"
            style={{ '--method-color': color, '--method-bg': bg }}
            onClick={() => handleMethod(key)}
            disabled={!allPrepared || state === 'processing'}
            id={`cashier-pay-${key.toLowerCase()}-btn`}
          >
            {state === 'processing' && processingMethod === key ? (
              <Loader2 size={20} className="cs-spin" />
            ) : (
              <Icon size={20} />
            )}
            <span style={{ fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* Amount due row — shows effective total and cashback note */}
      <div className="cs-payment__total-row">
        <span>Amount due</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          {cashbackApplied > 0 && (
            <span className="cs-payment__cashback-deduct">
              <Wallet size={11} /> −₹{cashbackApplied.toFixed(2)} cashback
            </span>
          )}
          <span className="cs-payment__total-value">
            <IndianRupee size={14} />
            {totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
