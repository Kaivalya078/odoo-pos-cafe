import { IndianRupee, ShoppingCart, TrendingUp, Users } from 'lucide-react';

const CARDS = [
  { key: 'totalRevenue', label: 'Total Revenue', icon: IndianRupee, prefix: '₹', color: '#3fb950' },
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingCart, prefix: '', color: '#58a6ff' },
  { key: 'avgOrderValue', label: 'Avg Order Value', icon: TrendingUp, prefix: '₹', color: '#bc8cff' },
  { key: 'totalSessions', label: 'Sessions Closed', icon: Users, prefix: '', color: '#d4a853' },
];

export default function SummaryCards({ data, loading }) {
  if (loading) {
    return (
      <div className="an-summary-row">
        {CARDS.map((c) => (
          <div key={c.key} className="an-summary-card an-summary-card--loading">
            <div className="spinner" style={{ width: 18, height: 18 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="an-summary-row" id="analytics-summary-cards">
      {CARDS.map(({ key, label, icon: Icon, prefix, color }) => (
        <div key={key} className="an-summary-card" style={{ '--card-accent': color }}>
          <div className="an-summary-card__icon">
            <Icon size={20} />
          </div>
          <div className="an-summary-card__value">
            {prefix}{(data?.[key] ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="an-summary-card__label">{label}</div>
        </div>
      ))}
    </div>
  );
}
