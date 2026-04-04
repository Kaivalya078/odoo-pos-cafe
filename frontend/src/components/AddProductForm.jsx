import { useState, useEffect } from 'react';
import { Plus, Minus, Package } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  image: '',
  variants: [],
  addons: [],
};

export default function AddProductForm({ onSubmit, editingProduct, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!editingProduct;

  // Populate form when editing
  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        category: editingProduct.category || '',
        image: editingProduct.image || '',
        variants: editingProduct.variants?.length ? [...editingProduct.variants] : [],
        addons: editingProduct.addons?.length ? [...editingProduct.addons] : [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingProduct]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- Variant helpers ---
  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: '', price: '' }],
    }));
  };

  const removeVariant = (idx) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const updateVariant = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === idx ? { ...v, [field]: field === 'price' ? value : value } : v
      ),
    }));
  };

  // --- Addon helpers ---
  const addAddon = () => {
    setForm((prev) => ({
      ...prev,
      addons: [...prev.addons, { name: '', price: '' }],
    }));
  };

  const removeAddon = (idx) => {
    setForm((prev) => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== idx),
    }));
  };

  const updateAddon = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      addons: prev.addons.map((a, i) =>
        i === idx ? { ...a, [field]: field === 'price' ? value : value } : a
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        image: form.image.trim() || undefined,
        variants: form.variants
          .filter((v) => v.name.trim())
          .map((v) => ({ name: v.name.trim(), price: Number(v.price) || 0 })),
        addons: form.addons
          .filter((a) => a.name.trim())
          .map((a) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
      };
      await onSubmit(payload, editingProduct?._id);
      if (!isEditing) setForm(EMPTY_FORM);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <Package size={16} />
        {isEditing ? 'Edit Product' : 'Add Product'}
      </div>
      <form onSubmit={handleSubmit}>
        {/* Row 1: Name + Category */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="product-name">Name</label>
            <input
              id="product-name"
              className="form-input"
              type="text"
              name="name"
              placeholder="Product name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="product-category">Category</label>
            <input
              id="product-category"
              className="form-input"
              type="text"
              name="category"
              placeholder="e.g. Beverages, Snacks"
              value={form.category}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Row 2: Description + Image URL */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="product-description">Description</label>
            <input
              id="product-description"
              className="form-input"
              type="text"
              name="description"
              placeholder="Short description (optional)"
              value={form.description}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="product-image">Image URL</label>
            <input
              id="product-image"
              className="form-input"
              type="text"
              name="image"
              placeholder="https://... (optional)"
              value={form.image}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Variants */}
        <div className="form-group">
          <div className="dynamic-list-header">
            <label className="form-label">Variants</label>
            <button type="button" className="btn-icon" onClick={addVariant} title="Add variant">
              <Plus size={14} />
            </button>
          </div>
          {form.variants.map((v, idx) => (
            <div className="dynamic-list-row" key={idx}>
              <input
                className="form-input"
                type="text"
                placeholder="Variant name"
                value={v.name}
                onChange={(e) => updateVariant(idx, 'name', e.target.value)}
              />
              <input
                className="form-input dynamic-list-price"
                type="number"
                placeholder="Price"
                min="0"
                step="0.01"
                value={v.price}
                onChange={(e) => updateVariant(idx, 'price', e.target.value)}
              />
              <button type="button" className="btn-icon btn-icon--danger" onClick={() => removeVariant(idx)} title="Remove">
                <Minus size={14} />
              </button>
            </div>
          ))}
          {form.variants.length === 0 && (
            <span className="dynamic-list-empty">No variants — click + to add</span>
          )}
        </div>

        {/* Addons */}
        <div className="form-group">
          <div className="dynamic-list-header">
            <label className="form-label">Add-ons</label>
            <button type="button" className="btn-icon" onClick={addAddon} title="Add add-on">
              <Plus size={14} />
            </button>
          </div>
          {form.addons.map((a, idx) => (
            <div className="dynamic-list-row" key={idx}>
              <input
                className="form-input"
                type="text"
                placeholder="Add-on name"
                value={a.name}
                onChange={(e) => updateAddon(idx, 'name', e.target.value)}
              />
              <input
                className="form-input dynamic-list-price"
                type="number"
                placeholder="Price"
                min="0"
                step="0.01"
                value={a.price}
                onChange={(e) => updateAddon(idx, 'price', e.target.value)}
              />
              <button type="button" className="btn-icon btn-icon--danger" onClick={() => removeAddon(idx)} title="Remove">
                <Minus size={14} />
              </button>
            </div>
          ))}
          {form.addons.length === 0 && (
            <span className="dynamic-list-empty">No add-ons — click + to add</span>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="product-submit"
          >
            {submitting ? 'Saving…' : isEditing ? 'Update Product' : 'Add Product'}
          </button>
          {isEditing && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancelEdit}
              id="product-cancel-edit"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
