const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addTracking,
  cancelOrder,
  getOrderByNumber,
  getOrderSummary,
  getAllOrders
} = require('../controllers/orderController');

// All order routes require authentication
router.use(authMiddleware);

// Create order from cart
router.post('/', createOrder);

// Get user's orders with optional filtering
router.get('/', getUserOrders);

// Get order summary/statistics for user
router.get('/summary', getOrderSummary);

// Get single order by ID
router.get('/:orderId', getOrderById);

// Get order by order number
router.get('/number/:orderNumber', getOrderByNumber);

// Cancel order (user only)
router.put('/:orderId/cancel', cancelOrder);

// Admin routes
router.use(requireAdmin);

// Get all orders (admin only)
router.get('/admin/all', getAllOrders);

// Update order status (admin only)
router.put('/:orderId/status', updateOrderStatus);

// Update payment status (admin only)
router.put('/:orderId/payment-status', updatePaymentStatus);

// Add tracking information (admin only)
router.put('/:orderId/tracking', addTracking);

module.exports = router;
