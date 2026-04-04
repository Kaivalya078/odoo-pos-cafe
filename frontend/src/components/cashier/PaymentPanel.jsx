import { useState } from 'react';
import { Banknote, CreditCard, Smartphone, CheckCircle, Loader2, IndianRupee } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { paySession, confirmPayment } from '../../services/cashierService';
import toast from 'react-hot-toast';

const METHODS = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#3fb950' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#58a6ff' },
  { key: 'UPI', label: 'UPI', icon: Smartphone, color: '#bc8cff' },
];

// paymentState: 'idle' | 'processing' | 'upi-qr'
export default function PaymentPanel({ sessionId, totalAmount, allPrepared, onPaymentComplete }) {
  const [paymentState, setPaymentState] = useState('idle');
  const [processingMethod, setProcessingMethod] = useState(null);
  const [upiData, setUpiData] = useState(null); // { upiUrl, amount }

  const handlePay = async (method) => {
    if (!allPrepared) {
      toast.error('All orders must be prepared before payment.');
      return;
    }

    setProcessingMethod(method);
    setPaymentState('processing');

    try {
      const res = await paySession(sessionId, method);
      const data = res.data.data;

      if (method === 'UPI') {
        // UPI returns upiUrl — show QR
        setUpiData({ upiUrl: data.upiUrl, amount: data.amount });
        setPaymentState('upi-qr');
      } else {
        // CASH / CARD — session closed by backend
        toast.success(`${method} payment of ₹${data.totalPaid?.toFixed(2)} processed!`);
        resetState();
        onPaymentComplete();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed';
      toast.error(msg);
      resetState();
    }
  };

  const handleConfirmUpi = async () => {
    setPaymentState('processing');
    setProcessingMethod('UPI');

    try {
      const res = await confirmPayment(sessionId);
      const data = res.data.data;
      toast.success(`UPI payment of ₹${data.totalPaid?.toFixed(2)} confirmed!`);
      resetState();
      onPaymentComplete();
    } catch (err) {
      const msg = err.response?.data?.message || 'UPI confirmation failed';
      toast.error(msg);
      // Go back to QR view so they can retry
      setPaymentState('upi-qr');
      setProcessingMethod(null);
    }
  };

  const handleCancelUpi = () => {
    resetState();
  };

  const resetState = () => {
    setPaymentState('idle');
    setProcessingMethod(null);
    setUpiData(null);
  };

  // UPI QR View
  if (paymentState === 'upi-qr' && upiData) {
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
              bgColor="#1a1d23"
              fgColor="#ececf1"
              level="M"
              includeMargin
            />
          </div>
          <p className="cs-payment__qr-label">Scan to pay</p>
          <div className="cs-payment__qr-amount">
            <IndianRupee size={18} />
            <span>{upiData.amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="cs-payment__qr-actions">
          <button
            className="btn btn-primary cs-payment__confirm-btn"
            onClick={handleConfirmUpi}
            disabled={paymentState === 'processing'}
            id="cashier-confirm-upi-btn"
          >
            {paymentState === 'processing' ? (
              <><Loader2 size={14} className="cs-spin" /> Confirming…</>
            ) : (
              <><CheckCircle size={14} /> Confirm Payment</>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCancelUpi}
            disabled={paymentState === 'processing'}
            id="cashier-cancel-upi-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Default: Method Selection View
  return (
    <div className="cs-payment" id="cashier-payment-panel">
      <div className="cs-payment__header">
        <CreditCard size={16} />
        <span>Payment</span>
      </div>

      {!allPrepared && (
        <div className="cs-payment__blocked">
          Payment is blocked until all orders are prepared by the kitchen.
        </div>
      )}

      <div className="cs-payment__methods">
        {METHODS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            className="cs-payment__method-btn"
            style={{ '--method-color': color }}
            onClick={() => handlePay(key)}
            disabled={!allPrepared || paymentState === 'processing'}
            id={`cashier-pay-${key.toLowerCase()}-btn`}
          >
            {paymentState === 'processing' && processingMethod === key ? (
              <Loader2 size={20} className="cs-spin" />
            ) : (
              <Icon size={20} />
            )}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="cs-payment__total-row">
        <span>Amount to pay</span>
        <span className="cs-payment__total-value">
          <IndianRupee size={14} />
          {totalAmount.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
