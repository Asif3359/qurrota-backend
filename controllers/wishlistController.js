const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

/**
 * Get user's wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let wishlist = await Wishlist.findOne({ user: userId, isActive: true })
      .populate({
        path: "products.product",
        select: "name price images brand isActive isPublished",
        match: { isActive: true, isPublished: true }
      });

    if (!wishlist) {
      // Create wishlist if it doesn't exist
      wishlist = new Wishlist({ user: userId });
      await wishlist.save();
    }

    // Filter out products that are no longer active/published
    wishlist.products = wishlist.products.filter(item => item.product);

    await wishlist.save();

    res.json({
      success: true,
      data: wishlist,
      message: "Wishlist retrieved successfully"
    });
  } catch (error) {
    console.error("Error getting wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving wishlist",
      error: error.message
    });
  }
};

/**
 * Add product to wishlist
 */
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    // Check if product exists and is active
    const product = await Product.findOne({ 
      _id: productId, 
      isActive: true, 
      isPublished: true 
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or not available"
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: userId, isActive: true });
    
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId });
    }

    // Add product to wishlist
    const result = wishlist.addProduct(productId, notes || "");

    if (!result.success) {
      return res.status(409).json({
        success: false,
        message: result.message
      });
    }

    await wishlist.save();

    // Populate the product details
    await wishlist.populate({
      path: "products.product",
      select: "name price images brand"
    });

    res.status(201).json({
      success: true,
      data: wishlist,
      message: result.message
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error adding product to wishlist",
      error: error.message
    });
  }
};

/**
 * Remove product from wishlist
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    const result = wishlist.removeProduct(productId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    await wishlist.save();

    res.json({
      success: true,
      data: wishlist,
      message: result.message
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error removing product from wishlist",
      error: error.message
    });
  }
};

/**
 * Check if product is in wishlist
 */
exports.checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });

    if (!wishlist) {
      return res.json({
        success: true,
        data: { isInWishlist: false },
        message: "Product not in wishlist"
      });
    }

    const isInWishlist = wishlist.hasProduct(productId);

    res.json({
      success: true,
      data: { isInWishlist },
      message: isInWishlist ? "Product is in wishlist" : "Product not in wishlist"
    });
  } catch (error) {
    console.error("Error checking wishlist status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking wishlist status",
      error: error.message
    });
  }
};

/**
 * Update wishlist settings
 */
exports.updateWishlistSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, isPublic } = req.body;

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    if (name !== undefined) wishlist.name = name;
    if (description !== undefined) wishlist.description = description;
    if (isPublic !== undefined) wishlist.isPublic = isPublic;

    await wishlist.save();

    res.json({
      success: true,
      data: wishlist,
      message: "Wishlist settings updated successfully"
    });
  } catch (error) {
    console.error("Error updating wishlist settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating wishlist settings",
      error: error.message
    });
  }
};

/**
 * Clear wishlist
 */
exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    wishlist.products = [];
    await wishlist.save();

    res.json({
      success: true,
      data: wishlist,
      message: "Wishlist cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing wishlist",
      error: error.message
    });
  }
};

/**
 * Get wishlist statistics
 */
exports.getWishlistStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true })
      .populate({
        path: "products.product",
        select: "name price images brand"
      });

    if (!wishlist) {
      return res.json({
        success: true,
        data: {
          totalProducts: 0,
          totalValue: 0,
          averagePrice: 0
        },
        message: "Wishlist is empty"
      });
    }

    const totalProducts = wishlist.products.length;
    const totalValue = wishlist.products.reduce((sum, item) => {
      return sum + (item.product ? item.product.price : 0);
    }, 0);
    const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalValue,
        averagePrice: Math.round(averagePrice * 100) / 100
      },
      message: "Wishlist statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Error getting wishlist stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving wishlist statistics",
      error: error.message
    });
  }
};
