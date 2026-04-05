import { useState } from 'react';
import { checkCash } from '../services/customerService';
import { Coffee, Phone, Wallet, Search, Lock, CheckCircle } from 'lucide-react';

export default function CashCheckPage() {
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await checkCash(mobile);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-page">
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="mobile-logo-icon"><Coffee size={22} /></div>
          <div>
            <h1 className="mobile-brand-name">POS Cafe</h1>
            <p className="mobile-brand-sub">Cashback Balance</p>
          </div>
        </div>
      </header>

      <main className="mobile-content" style={{ padding: 'var(--space-lg)' }}>
        <div className="cash-check-card">
          {/* Icon */}
          <div className="cash-check-icon">
            <Wallet size={40} />
          </div>
          <h2 className="cash-check-title">Check Your Cashback</h2>
          <p className="cash-check-subtitle">
            Enter your registered mobile number to view your available cashback balance.
          </p>

          {/* Input */}
          <div className="otp-gate__field" style={{ marginTop: 'var(--space-lg)', width: '100%' }}>
            <label className="otp-gate__label">
              <Phone size={14} /> Mobile Number
            </label>
            <input
              className="otp-gate__input"
              type="tel"
              inputMode="numeric"
              placeholder="98XXXXXXXX"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              id="cash-check-input"
              autoFocus
            />
          </div>

          {error && <p className="cash-check-error">{error}</p>}

          <button
            className="btn btn-primary otp-gate__btn"
            onClick={handleCheck}
            disabled={loading || mobile.length !== 10}
            id="cash-check-btn"
          >
            {loading ? (
              'Checking…'
            ) : (
              <><Search size={14} /> Check Balance</>
            )}
          </button>

          {/* Result */}
          {result && (
            <>
              {/* Locked state — earned today, usable from tomorrow */}
              {result.lockedUntilTomorrow ? (
                <div className="cash-check-result cash-check-result--locked">
                  <Lock size={32} className="cash-check-result__icon" style={{ color: '#b45309' }} />
                  <div className="cash-check-result__amount" style={{ color: '#b45309' }}>
                    ₹{result.cashBalance.toFixed(2)}
                  </div>
                  <div className="cash-check-result__label" style={{ color: '#92400e' }}>
                    Earned Today — Locked
                  </div>
                  <p className="cash-check-result__note">
                    🔒 This cashback was credited today. It will be available to use from <strong>tomorrow onwards</strong>.
                  </p>
                </div>
              ) : result.cashBalance > 0 ? (
                <div className="cash-check-result cash-check-result--positive">
                  <CheckCircle size={32} className="cash-check-result__icon" style={{ color: 'var(--status-open)' }} />
                  <div className="cash-check-result__amount">₹{result.cashBalance.toFixed(2)}</div>
                  <div className="cash-check-result__label">Available Cashback</div>
                  <p className="cash-check-result__note">
                    ✅ Ready to use! Tell the cashier your mobile number at checkout.
                  </p>
                </div>
              ) : (
                <div className="cash-check-result">
                  <Wallet size={32} className="cash-check-result__icon cash-check-result__icon--empty" />
                  <div className="cash-check-result__amount">₹0.00</div>
                  <div className="cash-check-result__label">No cashback yet</div>
                  <p className="cash-check-result__note">
                    {result.exists
                      ? 'Cashback is credited after your order is paid.'
                      : 'No account found. Verify your mobile number when ordering to earn cashback.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="cash-check-how">
          <h3 className="cash-check-how__title">How it works</h3>
          <div className="cash-check-how__step">
            <span className="cash-check-step-num">1</span>
            <span>Verify your mobile number when placing an order</span>
          </div>
          <div className="cash-check-how__step">
            <span className="cash-check-step-num">2</span>
            <span>10% cashback is credited to your account after payment</span>
          </div>
          <div className="cash-check-how__step">
            <span className="cash-check-step-num">3</span>
            <span>Cashback is available to redeem from the <strong>next day</strong> onwards</span>
          </div>
          <div className="cash-check-how__step">
            <span className="cash-check-step-num">4</span>
            <span>Tell the cashier your mobile number — they'll apply it at checkout</span>
          </div>
        </div>
      </main>
    </div>
  );
}
