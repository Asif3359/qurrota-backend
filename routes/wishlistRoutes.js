const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus,
  updateWishlistSettings,
  clearWishlist,
  getWishlistStats
} = require('../controllers/wishlistController');

// All wishlist routes require authentication
router.use(authenticateToken);

// Get user's wishlist
router.get('/', getWishlist);

// Add product to wishlist
router.post('/add', addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', removeFromWishlist);

// Check if product is in wishlist
router.get('/check/:productId', checkWishlistStatus);

// Update wishlist settings (name, description, privacy)
router.put('/settings', updateWishlistSettings);

// Clear entire wishlist
router.delete('/clear', clearWishlist);

// Get wishlist statistics
router.get('/stats', getWishlistStats);

module.exports = router;
