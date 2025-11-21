const Cart = require("../models/Cart");
const Product = require("../models/Product");
const crypto = require("crypto");

/**
 * Helper function to get or create cart for authenticated or anonymous users
 */
const getOrCreateCart = async (req) => {
  const isAuthenticated = req.isAuthenticated;
  let cart;

  if (isAuthenticated) {
    // Authenticated user - use userId
    const userId = req.user.id;
    cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      cart = new Cart({ user: userId });
      await cart.save();
    }
  } else {
    // Anonymous user - use sessionId
    let sessionId = req.sessionId || req.headers['x-session-id'] || req.body.sessionId;
    
    if (!sessionId) {
      // Generate a new sessionId if not provided
      sessionId = crypto.randomUUID();
    }

    cart = await Cart.findOne({ sessionId: sessionId, isActive: true });
    if (!cart) {
      cart = new Cart({ sessionId: sessionId });
      await cart.save();
    }
    
    // Set sessionId in response headers so client can store it
    req.sessionId = sessionId;
  }

  return cart;
};

/**
 * Get user's cart (authenticated or anonymous)
 */
exports.getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req);
    
    await cart.populate({
      path: "items.product",
      select: "name price images brand stock isActive isPublished",
      match: { isActive: true, isPublished: true }
    });

    // Filter out products that are no longer active/published
    cart.items = cart.items.filter(item => item.product);

    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: "Cart retrieved successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting cart:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cart",
      error: error.message
    });
  }
};

/**
 * Add item to cart (authenticated or anonymous)
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variantId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    if (quantity < 1 || quantity > 999) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1 and 999"
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

    // Check stock availability
    if (product.trackInventory && product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Get or create cart
    const cart = await getOrCreateCart(req);

    // Add item to cart
    const result = cart.addItem(productId, quantity, variantId, product.price, notes || "");

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    await cart.save();

    // Populate the product details
    await cart.populate({
      path: "items.product",
      select: "name price images brand stock"
    });

    const response = {
      success: true,
      data: cart,
      message: result.message
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Error adding item to cart",
      error: error.message
    });
  }
};

/**
 * Update cart item quantity (authenticated or anonymous)
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0 || quantity > 999) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 0 and 999"
      });
    }

    const cart = await getOrCreateCart(req);
    
    await cart.populate({
      path: "items.product",
      select: "name price stock trackInventory"
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const result = cart.updateItemQuantity(itemId, quantity);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    // Check stock if updating quantity
    if (quantity > 0) {
      const item = cart.items.id(itemId);
      if (item && item.product && item.product.trackInventory && item.product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${item.product.stock} items available in stock`
        });
      }
    }

    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: result.message
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message
    });
  }
};

/**
 * Remove item from cart
 */
// exports.removeFromCart = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { itemId } = req.params;

//     const cart = await Cart.findOne({ user: userId, isActive: true });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found"
//       });
//     }

//     const result = cart.removeItem(itemId);

//     if (!result.success) {
//       return res.status(404).json({
//         success: false,
//         message: result.message
//       });
//     }

//     await cart.save();

//     res.json({
//       success: true,
//       data: cart,
//       message: result.message
//     });
//   } catch (error) {
//     console.error("Error removing from cart:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error removing item from cart",
//       error: error.message
//     });
//   }
// };

/**
 * Remove item from cart (authenticated or anonymous)
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const isAuthenticated = req.isAuthenticated;
    const query = isAuthenticated 
      ? { user: req.user.id, isActive: true }
      : { sessionId: req.sessionId || req.headers['x-session-id'], isActive: true };

    const result = await Cart.updateOne(
      query,
      { $pull: { items: { _id: itemId } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart"
      });
    }

    const response = {
      success: true,
      message: "Item removed from cart successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message
    });
  }
};

/**
 * Clear cart (authenticated or anonymous)
 */
exports.clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const result = cart.clearCart();
    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: result.message
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message
    });
  }
};

/**
 * Check if product is in cart (authenticated or anonymous)
 */
exports.checkCartStatus = async (req, res) => {
  try {
    const { productId, variantId } = req.query;

    const cart = await getOrCreateCart(req);

    if (!cart || cart.items.length === 0) {
      const response = {
        success: true,
        data: { isInCart: false, quantity: 0 },
        message: "Product not in cart"
      };
      if (!req.isAuthenticated && req.sessionId) {
        response.sessionId = req.sessionId;
      }
      return res.json(response);
    }

    const isInCart = cart.hasProduct(productId, variantId);
    const item = cart.getItem(productId, variantId);
    const quantity = item ? item.quantity : 0;

    const response = {
      success: true,
      data: { isInCart, quantity },
      message: isInCart ? "Product is in cart" : "Product not in cart"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error checking cart status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking cart status",
      error: error.message
    });
  }
};

/**
 * Apply coupon to cart (authenticated or anonymous)
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required"
      });
    }

    const cart = await getOrCreateCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    // TODO: Implement actual coupon validation logic
    // For now, just store the coupon code
    cart.couponCode = couponCode.toUpperCase();
    cart.discountAmount = 0; // TODO: Calculate actual discount

    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: "Coupon applied successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Error applying coupon",
      error: error.message
    });
  }
};

/**
 * Remove coupon from cart (authenticated or anonymous)
 */
exports.removeCoupon = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.couponCode = undefined;
    cart.discountAmount = 0;

    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: "Coupon removed successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({
      success: false,
      message: "Error removing coupon",
      error: error.message
    });
  }
};

/**
 * Update shipping address (authenticated or anonymous)
 */
exports.updateShippingAddress = async (req, res) => {
  try {
    const addressData = req.body;

    const cart = await getOrCreateCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.shippingAddress = addressData;
    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: "Shipping address updated successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error updating shipping address:", error);
    res.status(500).json({
      success: false,
      message: "Error updating shipping address",
      error: error.message
    });
  }
};

/**
 * Update billing address (authenticated or anonymous)
 */
exports.updateBillingAddress = async (req, res) => {
  try {
    const addressData = req.body;

    const cart = await getOrCreateCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.billingAddress = addressData;
    await cart.save();

    const response = {
      success: true,
      data: cart,
      message: "Billing address updated successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error updating billing address:", error);
    res.status(500).json({
      success: false,
      message: "Error updating billing address",
      error: error.message
    });
  }
};

/**
 * Get cart summary (authenticated or anonymous)
 */
exports.getCartSummary = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req);
    
    await cart.populate({
      path: "items.product",
      select: "name price images brand stock"
    });

    if (!cart || cart.items.length === 0) {
      const response = {
        success: true,
        data: {
          totalItems: 0,
          subtotal: 0,
          discountAmount: 0,
          total: 0,
          items: []
        },
        message: "Cart is empty"
      };
      if (!req.isAuthenticated && req.sessionId) {
        response.sessionId = req.sessionId;
      }
      return res.json(response);
    }

    const summary = {
      totalItems: cart.totalItems,
      subtotal: cart.subtotal,
      discountAmount: cart.discountAmount,
      total: cart.total,
      items: cart.items,
      hasShippingAddress: !!cart.shippingAddress?.name,
      hasBillingAddress: !!cart.billingAddress?.name,
      couponCode: cart.couponCode
    };

    const response = {
      success: true,
      data: summary,
      message: "Cart summary retrieved successfully"
    };

    // Include sessionId in response for anonymous users
    if (!req.isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting cart summary:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cart summary",
      error: error.message
    });
  }
};
