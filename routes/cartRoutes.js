const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkCartStatus,
  applyCoupon,
  removeCoupon,
  updateShippingAddress,
  updateBillingAddress,
  getCartSummary
} = require('../controllers/cartController');

// All cart routes support both authenticated and anonymous users
router.use(optionalAuth);

// Get user's cart
router.get('/', getCart);

// Get cart summary (totals, items count, etc.)
router.get('/summary', getCartSummary);

// Add item to cart
router.post('/add', addToCart);

// Update cart item quantity
router.put('/items/:itemId', updateCartItem);

// Remove item from cart
router.delete('/items/:itemId', removeFromCart);

// Check if product is in cart
router.get('/check', checkCartStatus);

// Apply coupon to cart
router.post('/coupon/apply', applyCoupon);

// Remove coupon from cart
router.delete('/coupon', removeCoupon);

// Update shipping address
router.put('/shipping-address', updateShippingAddress);

// Update billing address
router.put('/billing-address', updateBillingAddress);

// Clear entire cart
router.delete('/clear', clearCart);

module.exports = router;
