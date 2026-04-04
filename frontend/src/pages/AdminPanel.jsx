import { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { getAllFloors } from '../services/floorService';
import { getTablesByFloor } from '../services/tableService';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { Settings, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import FloorList from '../components/FloorList';
import TableGrid from '../components/TableGrid';
import AddTableForm from '../components/AddTableForm';
import AddProductForm from '../components/AddProductForm';
import ProductList from '../components/ProductList';

export default function AdminPanel() {
  const { status, toggleStatus } = useRestaurant();
  const [toggling, setToggling] = useState(false);

  // Floor state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Table state
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Product state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

  // Fetch all floors
  const fetchFloors = useCallback(async () => {
    try {
      const res = await getAllFloors();
      setFloors(res.data.data);
    } catch (err) {
      toast.error('Failed to load floors');
    }
  }, []);

  // Fetch tables for selected floor
  const fetchTables = useCallback(async (floorId) => {
    setLoadingTables(true);
    try {
      const res = await getTablesByFloor(floorId);
      setTables(res.data.data);
    } catch (err) {
      toast.error('Failed to load tables');
    } finally {
      setLoadingTables(false);
    }
  }, []);

  // Fetch all products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await getAllProducts();
      setProducts(res.data.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchFloors();
    fetchProducts();
  }, [fetchFloors, fetchProducts]);

  // Refetch tables when selected floor changes
  useEffect(() => {
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    } else {
      setTables([]);
    }
  }, [selectedFloor, fetchTables]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const data = await toggleStatus();
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  const handleFloorCreated = () => {
    fetchFloors();
  };

  const handleTableCreated = () => {
    fetchFloors();
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    }
  };

  const handleTableDeleted = () => {
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    }
  };

  // --- Product handlers ---
  const handleProductSubmit = async (payload, productId) => {
    try {
      if (productId) {
        await updateProduct(productId, payload);
        toast.success('Product updated');
        setEditingProduct(null);
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleProductEdit = (product) => {
    setEditingProduct(product);
    // Scroll to form
    document.getElementById('product-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleProductDelete = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await deleteProduct(productId);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  // Product stats
  const categories = [...new Set(products.map((p) => p.category))];
  const availableCount = products.filter((p) => p.availability === 'AVAILABLE').length;
  const unavailableCount = products.filter((p) => p.availability === 'UNAVAILABLE').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage restaurant status, floors, tables and products</p>
      </div>

      {/* Restaurant Status */}
      <div className="card">
        <div className="card-title">
          <Settings size={16} />
          Restaurant Status
        </div>
        <div className="status-row">
          <div className="status-info">
            <span className="status-label">Current state:</span>
            <span className={`status-badge status-badge--${status === 'OPEN' ? 'open' : 'closed'}`}>
              <span className="status-dot" />
              {status || '…'}
            </span>
          </div>
          <button
            className={`btn-toggle btn-toggle--${status === 'OPEN' ? 'open' : 'closed'}`}
            onClick={handleToggle}
            disabled={toggling}
            id="admin-toggle-status"
          >
            {toggling ? 'Updating…' : status === 'OPEN' ? 'Close Restaurant' : 'Open Restaurant'}
          </button>
        </div>
      </div>

      {/* Floor Management */}
      <FloorList
        floors={floors}
        selectedFloor={selectedFloor}
        onSelectFloor={setSelectedFloor}
        onFloorCreated={handleFloorCreated}
      />

      {/* Add Table Form */}
      <AddTableForm
        floors={floors}
        onTableCreated={handleTableCreated}
      />

      {/* Table Grid */}
      <TableGrid
        tables={tables}
        selectedFloor={selectedFloor}
        loading={loadingTables}
        onTableDeleted={handleTableDeleted}
        onTableUpdated={handleTableDeleted}
      />

      {/* ── Product Management Section ──────────────────────────────────────── */}
      <div className="section-divider" />

      <div className="page-header">
        <h2 className="page-title" style={{ fontSize: 18 }}>
          <Package size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Product Management
        </h2>
        <p className="page-subtitle">Create, edit and manage your menu products</p>
      </div>

      {/* Product Stats */}
      <div className="stat-row">
        <div className="stat-item">
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{availableCount}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{unavailableCount}</div>
          <div className="stat-label">Unavailable</div>
        </div>
      </div>

      {/* Add / Edit Product Form */}
      <AddProductForm
        onSubmit={handleProductSubmit}
        editingProduct={editingProduct}
        onCancelEdit={() => setEditingProduct(null)}
      />

      {/* Product List */}
      <ProductList
        products={products}
        loading={loadingProducts}
        onEdit={handleProductEdit}
        onDelete={handleProductDelete}
      />
    </div>
  );
}
