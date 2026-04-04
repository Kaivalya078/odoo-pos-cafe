import { useState, useEffect } from 'react';
import { getPublicMenu } from '../services/productService';
import { Coffee, UtensilsCrossed } from 'lucide-react';

export default function PublicMenu() {
  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await getPublicMenu();
        setMenu(res.data.data);
      } catch (err) {
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
      <div className="menu-page">
        <div className="loading-spinner" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-page">
        <div className="menu-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-page">
      {/* Header */}
      <header className="menu-header">
        <div className="menu-header-content">
          <div className="menu-logo">
            <Coffee size={28} />
          </div>
          <h1 className="menu-title">POS Cafe</h1>
          <p className="menu-subtitle">Our Menu</p>
          <div className="menu-meta">
            <span>{totalItems} items</span>
            <span className="menu-meta-dot">·</span>
            <span>{categories.length} categories</span>
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="menu-content">
        {categories.length === 0 ? (
          <div className="menu-empty">
            <UtensilsCrossed size={48} />
            <p>Menu is currently empty.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <section className="menu-category" key={cat}>
              <h2 className="menu-category-title">{cat}</h2>
              <div className="menu-items-grid">
                {menu[cat].map((item) => (
                  <div className="menu-item" key={item._id}>
                    <div className="menu-item-header">
                      <h3 className="menu-item-name">{item.name}</h3>
                      <span className={`status-badge status-badge--${item.availability === 'AVAILABLE' ? 'open' : 'closed'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                        <span className="status-dot" />
                        {item.availability}
                      </span>
                    </div>
                    {item.description && (
                      <p className="menu-item-desc">{item.description}</p>
                    )}
                    {/* Variants */}
                    {item.variants && item.variants.length > 0 && (
                      <div className="menu-item-variants">
                        {item.variants.map((v, i) => (
                          <div className="menu-variant" key={i}>
                            <span className="menu-variant-name">{v.name}</span>
                            <span className="menu-variant-price">₹{v.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Addons */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="menu-item-addons">
                        <span className="menu-addons-label">Add-ons:</span>
                        {item.addons.map((a, i) => (
                          <span className="menu-addon-tag" key={i}>
                            {a.name} +₹{a.price}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="menu-footer">
        <p>POS Cafe · Menu is subject to availability</p>
      </footer>
    </div>
  );
}
