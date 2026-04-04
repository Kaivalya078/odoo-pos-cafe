import { useState } from 'react';
import { Plus, Minus, ShoppingCart, UtensilsCrossed } from 'lucide-react';

export default function ProductCard({ product, onAddToCart }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const isUnavailable = product.availability === 'UNAVAILABLE';

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.name === addon.name);
      if (exists) return prev.filter((a) => a.name !== addon.name);
      return [...prev, addon];
    });
  };

  const handleAdd = () => {
    if (isUnavailable) return;
    const cartItem = {
      product: product._id,
      productName: product.name,
      quantity,
    };
    if (selectedVariant) {
      cartItem.variant = { name: selectedVariant.name, price: selectedVariant.price };
      cartItem.displayPrice = selectedVariant.price;
    }
    if (selectedAddons.length > 0) {
      cartItem.addons = selectedAddons.map((a) => ({ name: a.name, price: a.price }));
    }
    onAddToCart(cartItem);
    setQuantity(1);
    setSelectedAddons([]);
  };

  let displayPrice = 0;
  if (selectedVariant) displayPrice = selectedVariant.price;
  selectedAddons.forEach((a) => { displayPrice += a.price; });
  displayPrice *= quantity;

  return (
    <div
      className={`order-product-card${isUnavailable ? ' order-product-card--disabled' : ''}`}
      id={`product-${product._id}`}
    >
      {/* Image Placeholder */}
      <div className="product-img-block">
        {product.image ? (
          <img src={product.image} alt={product.name} className="product-img" />
        ) : (
          <div className="product-img-placeholder">
            <UtensilsCrossed size={24} className="product-img-icon" />
            <span className="product-img-label">No Image</span>
          </div>
        )}
        {isUnavailable && (
          <span className="unavailable-badge product-img-badge">Unavailable</span>
        )}
      </div>

      {/* Body */}
      <div className="order-product-body">
        <div className="order-product-header">
          <h3 className="order-product-name">{product.name}</h3>
        </div>

        {product.description && (
          <p className="order-product-desc">{product.description}</p>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="order-product-section">
            <label className="order-section-label">Variant</label>
            <div className="order-variant-options">
              {product.variants.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  className={`order-variant-btn${selectedVariant?.name === v.name ? ' order-variant-btn--active' : ''}`}
                  onClick={() => setSelectedVariant(v)}
                  disabled={isUnavailable}
                >
                  <span>{v.name}</span>
                  <span className="order-variant-price">₹{v.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Addons */}
        {product.addons && product.addons.length > 0 && (
          <div className="order-product-section">
            <label className="order-section-label">Add-ons</label>
            <div className="order-addon-options">
              {product.addons.map((a, i) => {
                const isSelected = selectedAddons.find((sa) => sa.name === a.name);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`order-addon-btn${isSelected ? ' order-addon-btn--active' : ''}`}
                    onClick={() => toggleAddon(a)}
                    disabled={isUnavailable}
                  >
                    <span>{a.name}</span>
                    <span className="order-addon-price">+₹{a.price}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer: Qty + Add */}
        <div className="order-product-footer">
          <div className="order-qty-control">
            <button
              type="button"
              className="order-qty-btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={isUnavailable || quantity <= 1}
            >
              <Minus size={13} />
            </button>
            <span className="order-qty-value">{quantity}</span>
            <button
              type="button"
              className="order-qty-btn"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={isUnavailable}
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary order-add-btn"
            onClick={handleAdd}
            disabled={isUnavailable || (product.variants?.length > 0 && !selectedVariant)}
            id={`add-to-cart-${product._id}`}
          >
            <ShoppingCart size={13} />
            {displayPrice > 0 ? `Add ₹${displayPrice.toFixed(0)}` : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
