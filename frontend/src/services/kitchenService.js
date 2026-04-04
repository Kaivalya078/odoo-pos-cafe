import api from './api';

// ── KITCHEN endpoints ────────────────────────────────────────────────────────

// GET /api/kitchen/orders
// Returns orders with status APPROVED | PREPARING | PREPARED
// Response: { success, data: [Order] }
export const getKitchenOrders = () => api.get('/kitchen/orders');

// PATCH /api/kitchen/orders/:orderId/items/:itemId
// Increments preparedQuantity by 1 (backend auto-derives order status)
// Response: { success, data: Order }
export const updateItemPrepared = (orderId, itemId) =>
  api.patch(`/kitchen/orders/${orderId}/items/${itemId}`);
