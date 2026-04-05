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

// PATCH /api/kitchen/orders/:orderId/advance
// Moves the entire order to the next status in one action:
//   APPROVED → PREPARING  (all items set to fully prepared)
//   PREPARING → PREPARED  (all items set to fully prepared)
// Response: { success, data: Order }
export const advanceOrder = (orderId) =>
  api.patch(`/kitchen/orders/${orderId}/advance`);
