import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { createTable } from '../services/tableService';

export default function AddTableForm({ floors, onTableCreated }) {
  const [tableNumber, setTableNumber] = useState('');
  const [seats, setSeats] = useState('');
  const [floor, setFloor] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createTable({
        tableNumber: Number(tableNumber),
        seats: Number(seats),
        floor,
      });
      toast.success('Table created');
      setTableNumber('');
      setSeats('');
      setFloor('');
      onTableCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create table');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <Plus size={16} />
        Add Table
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row form-row--3">
          <div className="form-group">
            <label className="form-label" htmlFor="add-table-number">Table Number</label>
            <input
              id="add-table-number"
              className="form-input"
              type="number"
              min="1"
              placeholder="e.g. 1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="add-table-seats">Seats</label>
            <input
              id="add-table-seats"
              className="form-input"
              type="number"
              min="1"
              placeholder="e.g. 4"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="add-table-floor">Floor</label>
            <select
              id="add-table-floor"
              className="form-select"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              required
            >
              <option value="">Select floor</option>
              {floors.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating || floors.length === 0}
          id="create-table-submit"
        >
          {creating ? 'Creating…' : 'Create Table'}
        </button>
      </form>
    </div>
  );
}
