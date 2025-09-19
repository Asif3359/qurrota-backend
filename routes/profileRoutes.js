const express = require('express');
const { getProfile, updateProfile, updateProfileImage, updateProfileImageUrl, deleteAccount } = require('../controllers/profileController');
const authenticateToken = require('../middleware/authenticateToken');
const { uploadSingle, handleUploadError } = require('../middleware/upload');
const router = express.Router();

// All profile routes require authentication
router.use(authenticateToken);

// GET /api/profile - Get user profile
router.get('/', getProfile);

// PUT /api/profile - Update user profile
router.put('/', updateProfile);

// PUT /api/profile/image - Update profile image via file upload
router.put('/image', uploadSingle, handleUploadError, updateProfileImage);

// PUT /api/profile/image-url - Update profile image via URL
router.put('/image-url', updateProfileImageUrl);

// DELETE /api/profile - Delete user account
router.delete('/', deleteAccount);

module.exports = router;
