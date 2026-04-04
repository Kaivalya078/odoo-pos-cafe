import { useState } from 'react';
import { Plus, Minus, X, ShoppingCart, UtensilsCrossed } from 'lucide-react';

/* ─── Category → placeholder image ─── */
const CAT_IMG = {
  'food':        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'quick bites': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'quickbites':  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'coffee':      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
  'shakes':      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
  'milkshakes':  'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
  'desserts':    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
  'dessert':     'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
};
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';

/* ─── Popup modal for variants + addons selection ─── */
function CustomiseModal({ product, imgSrc, onClose, onConfirm }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.length > 0 ? product.variants[0] : null
  );
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const toggleAddon = (addon) =>
    setSelectedAddons((prev) =>
      prev.find((a) => a.name === addon.name)
        ? prev.filter((a) => a.name !== addon.name)
        : [...prev, addon]
    );

  let total = selectedVariant ? selectedVariant.price : 0;
  selectedAddons.forEach((a) => { total += a.price; });
  total *= quantity;

  const handleConfirm = () => {
    const item = { product: product._id, productName: product.name, quantity };
    if (selectedVariant) {
      item.variant = { name: selectedVariant.name, price: selectedVariant.price };
      item.displayPrice = selectedVariant.price;
    }
    if (selectedAddons.length > 0)
      item.addons = selectedAddons.map((a) => ({ name: a.name, price: a.price }));
    onConfirm(item);
    onClose();
  };

  return (
    <div className="pmodal-overlay" onClick={onClose}>
      <div className="pmodal" onClick={(e) => e.stopPropagation()}>

        {/* Drag handle + close row */}
        <div className="pmodal__handle-row">
          <div className="pmodal__handle" />
          <button className="pmodal__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="pmodal__body">
          <h3 className="pmodal__name">{product.name}</h3>
          {product.description && <p className="pmodal__desc">{product.description}</p>}

          {/* Variants — horizontal pill chips */}
          {product.variants?.length > 0 && (
            <div className="pmodal__section">
              <div className="pmodal__section-title">Choose variant</div>
              <div className="pmodal__chips-row">
                {product.variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`pmodal__chip${selectedVariant?.name === v.name ? ' pmodal__chip--active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <span className="pmodal__chip-name">{v.name}</span>
                    <span className="pmodal__chip-price">₹{v.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons — horizontally scrollable chips */}
          {product.addons?.length > 0 && (
            <div className="pmodal__section">
              <div className="pmodal__section-title">
                Add-ons <span className="pmodal__optional">optional</span>
              </div>
              <div className="pmodal__chips-scroll">
                {product.addons.map((a, i) => {
                  const on = !!selectedAddons.find((sa) => sa.name === a.name);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`pmodal__chip pmodal__chip--addon${on ? ' pmodal__chip--active' : ''}`}
                      onClick={() => toggleAddon(a)}
                    >
                      {on && <span className="pmodal__chip-check">✓ </span>}
                      <span className="pmodal__chip-name">{a.name}</span>
                      <span className="pmodal__chip-price">+₹{a.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pmodal__footer">
          <div className="pmodal__qty-control">
            <button
              className="pmodal__qty-btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="pmodal__qty-value">{quantity}</span>
            <button className="pmodal__qty-btn" onClick={() => setQuantity((q) => q + 1)}>
              <Plus size={16} />
            </button>
          </div>
          <button
            className="pmodal__add-btn"
            onClick={handleConfirm}
            disabled={product.variants?.length > 0 && !selectedVariant}
            id={`modal-add-${product._id}`}
          >
            <ShoppingCart size={16} />
            Add{total > 0 ? ` ₹${total.toFixed(0)}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main product card — Swiggy-style horizontal layout ─── */
export default function ProductCard({ product, onAddToCart }) {
  const [showModal, setShowModal] = useState(false);
  const isUnavailable = product.availability === 'UNAVAILABLE';
  const hasCustomisation = product.variants?.length > 0 || product.addons?.length > 0;

  const catKey = (product.category || '').toLowerCase().trim();
  const imgSrc = product.image || CAT_IMG[catKey] || DEFAULT_IMG;
  const basePrice = product.variants?.length > 0 ? product.variants[0].price : null;

  const handleAdd = () => {
    if (isUnavailable) return;
    if (hasCustomisation) {
      setShowModal(true);
    } else {
      onAddToCart({ product: product._id, productName: product.name, quantity: 1 });
    }
  };

  return (
    <>
      <div
        className={`pc-card${isUnavailable ? ' pc-card--disabled' : ''}`}
        id={`product-${product._id}`}
      >
        {/* LEFT — text info */}
        <div className="pc-card__left">
          <span className="pc-card__veg-dot" />
          <h3 className="pc-card__name">{product.name}</h3>
          {basePrice !== null && (
            <div className="pc-card__price">₹{basePrice}</div>
          )}
          {product.description && (
            <p className="pc-card__desc">{product.description}</p>
          )}
          {isUnavailable && (
            <span className="pc-card__unavailable">Currently unavailable</span>
          )}
        </div>

        {/* RIGHT — image + ADD overlay */}
        <div className="pc-card__right">
          <div className="pc-card__img-wrap">
            <img
              src={imgSrc}
              alt={product.name}
              className="pc-card__img"
              loading="lazy"
              onError={(e) => {
                const fallback = CAT_IMG[catKey] || DEFAULT_IMG;
                if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
              }}
            />
            {!isUnavailable && (
              <button
                className="pc-card__add-btn"
                onClick={handleAdd}
                id={`add-to-cart-${product._id}`}
              >
                <span>ADD</span>
                <Plus size={13} strokeWidth={3} />
              </button>
            )}
          </div>
          {hasCustomisation && !isUnavailable && (
            <span className="pc-card__customisable">customisable</span>
          )}
        </div>
      </div>

      {showModal && (
        <CustomiseModal
          product={product}
          imgSrc={imgSrc}
          onClose={() => setShowModal(false)}
          onConfirm={onAddToCart}
        />
      )}
    </>
  );
}
