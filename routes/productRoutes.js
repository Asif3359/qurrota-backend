const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const requireAdmin = require('../middleware/requireAdmin');
const { createProduct, listProducts, getProductByIdOrSlug, updateProduct, deleteProduct, getProducts,debugProducts } = require('../controllers/productController');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

// Public
router.get('/', listProducts);
router.get('/published', getProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);


// Admin-only
router.post('/', authenticateToken, requireAdmin, uploadMultiple, handleUploadError, createProduct);
router.put('/:id', authenticateToken, requireAdmin, uploadMultiple, handleUploadError, updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

module.exports = router;
