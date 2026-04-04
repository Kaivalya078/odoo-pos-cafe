import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

export default function Cart({ items, onUpdateQty, onRemove, customerName, onCustomerNameChange, onPlaceOrder, placing }) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="order-cart" id="order-cart">
      <div className="order-cart-header">
        <div className="order-cart-title">
          <ShoppingBag size={16} />
          <span>Cart</span>
          {itemCount > 0 && <span className="order-cart-badge">{itemCount}</span>}
        </div>
      </div>

      {/* Cart Items */}
      <div className="order-cart-items">
        {items.length === 0 ? (
          <p className="order-cart-empty">Your cart is empty</p>
        ) : (
          items.map((item, idx) => (
            <div className="order-cart-item" key={idx}>
              <div className="order-cart-item-info">
                <span className="order-cart-item-name">{item.productName}</span>
                {item.variant && (
                  <span className="order-cart-item-detail">
                    {item.variant.name} · ₹{item.variant.price}
                  </span>
                )}
                {item.addons && item.addons.length > 0 && (
                  <span className="order-cart-item-detail">
                    + {item.addons.map((a) => a.name).join(', ')}
                  </span>
                )}
              </div>
              <div className="order-cart-item-actions">
                <div className="order-qty-control order-qty-control--sm">
                  <button
                    type="button"
                    className="order-qty-btn"
                    onClick={() => onUpdateQty(idx, item.quantity - 1)}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="order-qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="order-qty-btn"
                    onClick={() => onUpdateQty(idx, item.quantity + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-icon btn-icon--danger"
                  onClick={() => onRemove(idx)}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Name */}
      <div className="order-cart-footer">
        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
          <label className="form-label" htmlFor="customer-name">Your Name</label>
          <input
            id="customer-name"
            className="form-input"
            type="text"
            placeholder="Enter your name"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            required
          />
        </div>

        <button
          type="button"
          className="btn btn-primary order-place-btn"
          onClick={onPlaceOrder}
          disabled={placing || items.length === 0 || !customerName.trim()}
          id="place-order-btn"
        >
          {placing ? 'Placing Order…' : `Place Order (${itemCount} item${itemCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
}
