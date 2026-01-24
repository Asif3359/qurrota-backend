const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

// Public route - get active banners (returns active banners or defaults)
router.get('/active', getActiveBanners);

// Admin-only routes
router.get('/', authenticateToken, requireAdmin, getAllBanners);
router.get('/:id', authenticateToken, requireAdmin, getBannerById);
router.post('/', authenticateToken, requireAdmin, uploadSingle, handleUploadError, createBanner);
router.put('/:id', authenticateToken, requireAdmin, uploadSingle, handleUploadError, updateBanner);
router.delete('/:id', authenticateToken, requireAdmin, deleteBanner);

module.exports = router;
