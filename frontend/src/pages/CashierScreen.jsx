import { useRestaurant } from '../context/RestaurantContext';
import { CreditCard } from 'lucide-react';

export default function CashierScreen() {
  const { status } = useRestaurant();

  return (
    <div className="placeholder-screen">
      <CreditCard className="placeholder-icon" />
      <h1 className="placeholder-title">Cashier Terminal</h1>
      <p className="placeholder-text">No active features available yet.</p>
      {status && (
        <div style={{ marginTop: 24 }}>
          <span className={`status-badge status-badge--${status === 'OPEN' ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            Restaurant is {status}
          </span>
        </div>
      )}
    </div>
  );
}
