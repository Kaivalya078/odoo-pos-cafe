import { Trash2, Plus, Minus, ShoppingBag, X } from 'lucide-react';

export default function Cart({
  items,
  onUpdateQty,
  onRemove,
  customerName,
  onCustomerNameChange,
  onPlaceOrder,
  placing,
  isOpen,
  onClose,
}) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, item) => {
    let price = item.variant?.price || 0;
    (item.addons || []).forEach((a) => { price += a.price; });
    return sum + price * item.quantity;
  }, 0);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="cart-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      {/* Bottom Sheet */}
      <div className={`cart-sheet${isOpen ? ' cart-sheet--open' : ''}`} id="order-cart">
        {/* Handle */}
        <div className="cart-sheet-handle" />

        {/* Header */}
        <div className="cart-sheet-header">
          <div className="cart-sheet-title">
            <ShoppingBag size={16} />
            <span>Your Cart</span>
            {itemCount > 0 && (
              <span className="order-cart-badge">{itemCount}</span>
            )}
          </div>
          <button className="cart-sheet-close" onClick={onClose} aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="cart-sheet-items">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingBag size={36} className="cart-empty-icon" />
              <p>Your cart is empty</p>
              <span>Add items from the menu above</span>
            </div>
          ) : (
            items.map((item, idx) => (
              <div className="cart-item" key={idx}>
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.productName}</span>
                  {item.variant && (
                    <span className="cart-item-detail">
                      {item.variant.name} · ₹{item.variant.price}
                    </span>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <span className="cart-item-detail">
                      + {item.addons.map((a) => a.name).join(', ')}
                    </span>
                  )}
                </div>
                <div className="cart-item-actions">
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

        {/* Footer */}
        <div className="cart-sheet-footer">
          {/* Total */}
          {items.length > 0 && (
            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-value">₹{totalAmount.toFixed(0)}</span>
            </div>
          )}

          {/* Name input */}
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
            {placing
              ? 'Placing Order…'
              : `Place Order · ₹${totalAmount.toFixed(0)}`}
          </button>
        </div>
      </div>
    </>
  );
}
