import { Trophy } from 'lucide-react';

const MEDAL_COLORS = ['#d4a853', '#8e8ea0', '#a06133', '#565869', '#565869'];

export default function TopProducts({ products, loading }) {
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: 120 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <p className="an-empty">No product data available yet.</p>
    );
  }

  const maxQty = Math.max(...products.map((p) => p.totalQuantity), 1);

  return (
    <div className="an-top-products" id="analytics-top-products">
      {products.map((product, idx) => (
        <div key={product.productName} className="an-top-item">
          <div className="an-top-item__rank" style={{ color: MEDAL_COLORS[idx] || 'var(--text-muted)' }}>
            {idx === 0 ? <Trophy size={16} /> : `#${idx + 1}`}
          </div>
          <div className="an-top-item__info">
            <div className="an-top-item__name">{product.productName}</div>
            <div className="an-top-item__bar-track">
              <div
                className="an-top-item__bar-fill"
                style={{ width: `${(product.totalQuantity / maxQty) * 100}%` }}
              />
            </div>
          </div>
          <div className="an-top-item__stats">
            <span className="an-top-item__qty">{product.totalQuantity} sold</span>
            <span className="an-top-item__rev">₹{product.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
