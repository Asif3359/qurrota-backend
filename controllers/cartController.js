const Cart = require("../models/Cart");
const Product = require("../models/Product");

/**
 * Get user's cart
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: "items.product",
        select: "name price images brand stock isActive isPublished",
        match: { isActive: true, isPublished: true }
      });

    if (!cart) {
      // Create cart if it doesn't exist
      cart = new Cart({ user: userId });
      await cart.save();
    }

    // Filter out products that are no longer active/published
    cart.items = cart.items.filter(item => item.product);

    await cart.save();

    res.json({
      success: true,
      data: cart,
      message: "Cart retrieved successfully"
    });
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
 * Add item to cart
 */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
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

    // Find or create cart
    let cart = await Cart.findOne({ user: userId, isActive: true });
    
    if (!cart) {
      cart = new Cart({ user: userId });
    }

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

    res.status(201).json({
      success: true,
      data: cart,
      message: result.message
    });
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
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0 || quantity > 999) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 0 and 999"
      });
    }

    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
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

    res.json({
      success: true,
      data: cart,
      message: result.message
    });
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
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const result = await Cart.updateOne(
      { user: userId, isActive: true },
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

    res.json({
      success: true,
      message: "Item removed from cart successfully"
    });
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
 * Clear cart
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const result = cart.clearCart();
    await cart.save();

    res.json({
      success: true,
      data: cart,
      message: result.message
    });
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
 * Check if product is in cart
 */
exports.checkCartStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variantId } = req.query;

    const cart = await Cart.findOne({ user: userId, isActive: true });

    if (!cart) {
      return res.json({
        success: true,
        data: { isInCart: false, quantity: 0 },
        message: "Product not in cart"
      });
    }

    const isInCart = cart.hasProduct(productId, variantId);
    const item = cart.getItem(productId, variantId);
    const quantity = item ? item.quantity : 0;

    res.json({
      success: true,
      data: { isInCart, quantity },
      message: isInCart ? "Product is in cart" : "Product not in cart"
    });
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
 * Apply coupon to cart
 */
exports.applyCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required"
      });
    }

    const cart = await Cart.findOne({ user: userId, isActive: true });

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

    res.json({
      success: true,
      data: cart,
      message: "Coupon applied successfully"
    });
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
 * Remove coupon from cart
 */
exports.removeCoupon = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.couponCode = undefined;
    cart.discountAmount = 0;

    await cart.save();

    res.json({
      success: true,
      data: cart,
      message: "Coupon removed successfully"
    });
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
 * Update shipping address
 */
exports.updateShippingAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressData = req.body;

    const cart = await Cart.findOne({ user: userId, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.shippingAddress = addressData;
    await cart.save();

    res.json({
      success: true,
      data: cart,
      message: "Shipping address updated successfully"
    });
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
 * Update billing address
 */
exports.updateBillingAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressData = req.body;

    const cart = await Cart.findOne({ user: userId, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.billingAddress = addressData;
    await cart.save();

    res.json({
      success: true,
      data: cart,
      message: "Billing address updated successfully"
    });
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
 * Get cart summary
 */
exports.getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: "items.product",
        select: "name price images brand stock"
      });

    if (!cart) {
      return res.json({
        success: true,
        data: {
          totalItems: 0,
          subtotal: 0,
          discountAmount: 0,
          total: 0,
          items: []
        },
        message: "Cart is empty"
      });
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

    res.json({
      success: true,
      data: summary,
      message: "Cart summary retrieved successfully"
    });
  } catch (error) {
    console.error("Error getting cart summary:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cart summary",
      error: error.message
    });
  }
};
