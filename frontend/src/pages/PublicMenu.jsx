import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicMenu } from '../services/productService';
import { Coffee, UtensilsCrossed, CalendarDays, ArrowRight } from 'lucide-react';

const CATEGORY_COLORS = [
  { bg: '#1e2a3a', accent: '#cbd5f5', emoji: '☕' },
  { bg: '#2a1e3a', accent: '#e9d5ff', emoji: '🍜' },
  { bg: '#3a1e24', accent: '#fde2e4', emoji: '🍱' },
  { bg: '#1e3a2a', accent: '#d1fae5', emoji: '🥗' },
  { bg: '#3a2e1e', accent: '#fde8c8', emoji: '🍹' },
  { bg: '#1e2e3a', accent: '#bae6fd', emoji: '🍛' },
];

export default function PublicMenu() {
  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await getPublicMenu();
        setMenu(res.data.data);
      } catch {
        setError('Unable to load menu. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = Object.keys(menu).sort();
  const totalItems = Object.values(menu).reduce((sum, items) => sum + items.length, 0);

  if (loading) {
    return (
      <div className="mobile-page">
        <div className="loading-spinner" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-page">
        <div className="menu-error"><p>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="mobile-page">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="mobile-logo-icon">
            <Coffee size={22} />
          </div>
          <div>
            <h1 className="mobile-brand-name">POS Cafe</h1>
            <p className="mobile-brand-sub">{totalItems} items · {categories.length} categories</p>
          </div>
        </div>
        <Link to="/book" className="btn btn-primary btn-sm" id="menu-reserve-btn">
          <CalendarDays size={14} />
          Reserve
        </Link>
      </header>

      <main className="mobile-content">
        {categories.length === 0 ? (
          <div className="menu-empty">
            <UtensilsCrossed size={48} />
            <p>Menu is currently empty.</p>
          </div>
        ) : (
          <>
            {/* Category tiles */}
            <section className="pm-categories">
              <h2 className="pm-section-title">Browse Categories</h2>
              <div className="pm-category-grid">
                {categories.map((cat, i) => {
                  const style = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <a
                      key={cat}
                      href={`#menu-cat-${cat}`}
                      className="pm-category-tile"
                      style={{ background: style.bg, '--tile-accent': style.accent }}
                    >
                      <span className="pm-cat-emoji">{style.emoji}</span>
                      <span className="pm-cat-name" style={{ color: style.accent }}>{cat}</span>
                      <span className="pm-cat-count">{menu[cat].length} items</span>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* Menu sections */}
            {categories.map((cat, ci) => {
              const style = CATEGORY_COLORS[ci % CATEGORY_COLORS.length];
              return (
                <section className="pm-section" key={cat} id={`menu-cat-${cat}`}>
                  <div className="pm-section-header" style={{ borderLeftColor: style.accent }}>
                    <span className="pm-section-emoji">{style.emoji}</span>
                    <h2 className="menu-category-title">{cat}</h2>
                  </div>
                  <div className="pm-items-grid">
                    {menu[cat].map((item) => (
                      <div className="pm-item-card" key={item._id}>
                        {/* Availability badge */}
                        <span className={`status-badge status-badge--${item.availability === 'AVAILABLE' ? 'open' : 'closed'} pm-avail-badge`}>
                          <span className="status-dot" />
                          {item.availability === 'AVAILABLE' ? 'Available' : 'Unavailable'}
                        </span>
                        <h3 className="pm-item-name">{item.name}</h3>
                        {item.description && (
                          <p className="pm-item-desc">{item.description}</p>
                        )}
                        {item.variants && item.variants.length > 0 && (
                          <div className="pm-variants">
                            {item.variants.map((v, i) => (
                              <div className="pm-variant-row" key={i}>
                                <span className="pm-variant-name">{v.name}</span>
                                <span className="pm-variant-price">₹{v.price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <div className="pm-addons">
                            <span className="pm-addons-label">Add-ons: </span>
                            {item.addons.map((a, i) => (
                              <span className="menu-addon-tag" key={i}>{a.name} +₹{a.price}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Order CTA */}
            <div className="pm-order-cta">
              <Link to="/tables" className="btn btn-primary" id="menu-order-btn" style={{ width: '100%', justifyContent: 'center' }}>
                <UtensilsCrossed size={16} />
                Start Ordering
                <ArrowRight size={16} />
              </Link>
            </div>
          </>
        )}
      </main>

      <footer className="menu-footer">
        <p>POS Cafe · Menu is subject to availability</p>
      </footer>
    </div>
  );
}
