import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { createFloor } from '../services/floorService';

export default function FloorList({ floors, selectedFloor, onSelectFloor, onFloorCreated }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createFloor({ name: name.trim() });
      toast.success('Floor created');
      setName('');
      onFloorCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create floor');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <Layers size={16} />
        Floor Management
      </div>

      {/* Add floor form */}
      <form className="floor-add-row" onSubmit={handleCreate}>
        <input
          id="floor-name-input"
          className="form-input"
          type="text"
          placeholder="New floor name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={creating}
          id="create-floor-btn"
        >
          <Plus size={14} />
          {creating ? 'Adding…' : 'Add Floor'}
        </button>
      </form>

      {/* Floor list */}
      <div className="floor-list">
        {floors.length === 0 ? (
          <div className="floor-empty">No floors yet. Add one above.</div>
        ) : (
          floors.map((f) => (
            <button
              key={f._id}
              className={`floor-chip${selectedFloor?._id === f._id ? ' floor-chip--active' : ''}`}
              onClick={() => onSelectFloor(f)}
              id={`floor-chip-${f._id}`}
            >
              {f.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
