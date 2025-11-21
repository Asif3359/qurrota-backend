const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
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

// Routes that support both authenticated and anonymous users
// Create order - supports anonymous
router.post('/', optionalAuth, createOrder);

// Get user's orders - supports anonymous (by sessionId)
router.get('/', optionalAuth, getUserOrders);

// Get order summary - supports anonymous
router.get('/summary', optionalAuth, getOrderSummary);

// Get single order by ID - supports anonymous
router.get('/:orderId', optionalAuth, getOrderById);

// Get order by order number - supports anonymous (public lookup)
router.get('/number/:orderNumber', optionalAuth, getOrderByNumber);

// Cancel order - supports anonymous
router.put('/:orderId/cancel', optionalAuth, cancelOrder);

// Admin routes require authentication
router.use(authMiddleware);

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
