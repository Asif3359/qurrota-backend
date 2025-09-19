// controllers/profileController.js
const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const { uploadImage, deleteImage, extractPublicId } = require("../config/cloudinary");

/**
 * Get user profile information
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.user.id;
    
    const user = await User.findById(userId).select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil');
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "Profile retrieved successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({
      message: "Server error getting profile"
    });
  }
};

/**
 * Update user profile information
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user.id;
    const {
      name,
      dateOfBirth,
      phoneNumber,
      bio,
      preferences,
      currentPassword,
      newPassword
    } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Update basic profile information
    if (name !== undefined) user.name = name;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (bio !== undefined) user.bio = bio;
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    // Handle password change if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to change password"
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: "Current password is incorrect"
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters long"
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      message: "Server error updating profile"
    });
  }
};

/**
 * Update user profile image via file upload
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No image file provided"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Delete old image from Cloudinary if it exists and is not the default
    if (user.image && user.image.includes('cloudinary.com')) {
      const oldPublicId = extractPublicId(user.image);
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    }

    // Upload new image to Cloudinary
    const uploadResult = await uploadImage(
      req.file.buffer, 
      'qurrota/profiles', 
      `profile_${userId}`
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        message: "Failed to upload image",
        error: uploadResult.error
      });
    }

    // Update user's image URL
    user.image = uploadResult.url;
    await user.save();

    res.json({
      message: "Profile image updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt
      },
      imageInfo: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format
      }
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    res.status(500).json({
      message: "Server error updating profile image"
    });
  }
};

/**
 * Update user profile image via URL (alternative method)
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
const updateProfileImageUrl = async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        message: "Image URL is required"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Delete old image from Cloudinary if it exists and is not the default
    if (user.image && user.image.includes('cloudinary.com')) {
      const oldPublicId = extractPublicId(user.image);
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    }

    user.image = image;
    await user.save();

    res.json({
      message: "Profile image updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    res.status(500).json({
      message: "Server error updating profile image"
    });
  }
};

/**
 * Delete user account
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required to delete account"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Incorrect password"
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      message: "Server error deleting account"
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfileImage,
  updateProfileImageUrl,
  deleteAccount
};
