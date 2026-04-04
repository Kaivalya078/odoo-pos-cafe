import { Pencil, Trash2, Package } from 'lucide-react';

export default function ProductList({ products, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="card">
        <div className="card-title">
          <Package size={16} />
          Products
        </div>
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <Package size={16} />
        All Products
      </div>
      {products.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          No products yet. Use the form above to add one.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Add-ons</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="product-name-cell">
                      <span>{p.name}</span>
                      {p.description && (
                        <span className="product-description">{p.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="category-tag">{p.category}</span>
                  </td>
                  <td>
                    {p.variants && p.variants.length > 0 ? (
                      <span className="variant-count">{p.variants.length} variant{p.variants.length > 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    {p.addons && p.addons.length > 0 ? (
                      <span className="variant-count">{p.addons.length} add-on{p.addons.length > 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${p.availability === 'AVAILABLE' ? 'open' : 'closed'}`}>
                      <span className="status-dot" />
                      {p.availability}
                    </span>
                  </td>
                  <td>
                    <div className="product-actions">
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => onEdit(p)}
                        id={`edit-product-${p._id}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title="Delete"
                        onClick={() => onDelete(p._id)}
                        id={`delete-product-${p._id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
