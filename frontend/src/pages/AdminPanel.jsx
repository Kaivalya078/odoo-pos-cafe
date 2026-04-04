import { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { getAllFloors } from '../services/floorService';
import { getTablesByFloor } from '../services/tableService';
import { Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import FloorList from '../components/FloorList';
import TableGrid from '../components/TableGrid';
import AddTableForm from '../components/AddTableForm';

export default function AdminPanel() {
  const { status, toggleStatus } = useRestaurant();
  const [toggling, setToggling] = useState(false);

  // Floor state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Table state
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

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

  useEffect(() => {
    fetchFloors();
  }, [fetchFloors]);

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
    fetchFloors(); // refresh in case floor selection needed
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    }
  };

  const handleTableDeleted = () => {
    if (selectedFloor) {
      fetchTables(selectedFloor._id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage restaurant status, floors and tables</p>
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
    </div>
  );
}
