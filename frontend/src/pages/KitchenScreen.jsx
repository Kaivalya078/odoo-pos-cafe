import { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { getKitchenProducts, toggleAvailability } from '../services/productService';
import { ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import AvailabilityToggle from '../components/AvailabilityToggle';

export default function KitchenScreen() {
  const { status } = useRestaurant();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getKitchenProducts();
      setProducts(res.data.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggle = async (productId) => {
    try {
      const res = await toggleAvailability(productId);
      const updated = res.data.data;
      // Optimistic UI: update just the toggled product
      setProducts((prev) =>
        prev.map((p) =>
          p._id === updated.id ? { ...p, availability: updated.availability } : p
        )
      );
      toast.success(`${updated.name}: ${updated.availability}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
      // Refetch on error to stay in sync
      fetchProducts();
    }
  };

  // Group products by category
  const grouped = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const categoryNames = Object.keys(grouped).sort();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kitchen Display</h1>
        <p className="page-subtitle">Manage product availability for the kitchen</p>
      </div>

      {/* Restaurant Status */}
      {status && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <span className={`status-badge status-badge--${status === 'OPEN' ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            Restaurant is {status}
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : products.length === 0 ? (
        <div className="placeholder-screen" style={{ minHeight: 300 }}>
          <ChefHat className="placeholder-icon" />
          <h2 className="placeholder-title">No Products</h2>
          <p className="placeholder-text">Products will appear here once added by admin.</p>
        </div>
      ) : (
        categoryNames.map((cat) => (
          <div className="card" key={cat}>
            <div className="card-title">
              <ChefHat size={16} />
              {cat}
            </div>
            <div className="kitchen-product-list">
              {grouped[cat].map((p) => (
                <div
                  className={`kitchen-product-item ${p.availability === 'UNAVAILABLE' ? 'kitchen-product-item--unavailable' : ''}`}
                  key={p._id}
                >
                  <div className="kitchen-product-info">
                    <span className="kitchen-product-name">{p.name}</span>
                    {p.description && (
                      <span className="kitchen-product-desc">{p.description}</span>
                    )}
                  </div>
                  <AvailabilityToggle
                    productId={p._id}
                    availability={p.availability}
                    onToggle={handleToggle}
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
