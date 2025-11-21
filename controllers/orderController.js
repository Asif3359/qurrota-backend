const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const crypto = require("crypto");

/**
 * Helper function to get cart for authenticated or anonymous users
 */
const getCartForOrder = async (req) => {
  const isAuthenticated = req.isAuthenticated;
  
  if (isAuthenticated) {
    return await Cart.findOne({ user: req.user.id, isActive: true })
      .populate({
        path: "items.product",
        select: "name price images brand stock isActive isPublished",
        match: { isActive: true, isPublished: true }
      });
  } else {
    const sessionId = req.sessionId || req.headers['x-session-id'] || req.body.sessionId;
    if (!sessionId) {
      return null;
    }
    return await Cart.findOne({ sessionId: sessionId, isActive: true })
      .populate({
        path: "items.product",
        select: "name price images brand stock isActive isPublished",
        match: { isActive: true, isPublished: true }
      });
  }
};

/**
 * Create order from cart (authenticated or anonymous)
 */
exports.createOrder = async (req, res) => {
  try {
    const isAuthenticated = req.isAuthenticated;
    const { 
      paymentMethod, 
      shippingAddress, 
      billingAddress, 
      notes,
      couponCode,
      discountAmount,
      shippingCost,
      taxAmount,
      sessionId: bodySessionId
    } = req.body;

    // Validate shipping address is provided (required for orders)
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.email) {
      return res.status(400).json({
        success: false,
        message: "Shipping address with name and email is required"
      });
    }

    // Get cart (authenticated or anonymous)
    const cart = await getCartForOrder(req);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty or not found"
      });
    }

    // Validate cart items are still available
    const unavailableItems = cart.items.filter(item => !item.product);
    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some items in your cart are no longer available",
        unavailableItems: unavailableItems.map(item => item._id)
      });
    }

    // Create order from cart items
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes
    }));

    // Generate order number manually to ensure it's set
    const orderNumber = Order.generateOrderNumber();

    // Determine sessionId for anonymous users
    let orderSessionId = null;
    if (!isAuthenticated) {
      orderSessionId = req.sessionId || req.headers['x-session-id'] || bodySessionId;
      if (!orderSessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required for anonymous orders"
        });
      }
    }

    const order = new Order({
      user: isAuthenticated ? req.user.id : null,
      sessionId: orderSessionId,
      orderNumber,
      items: orderItems,
      paymentMethod,
      shippingAddress,
      billingAddress,
      notes,
      couponCode: cart.couponCode || couponCode,
      discountAmount: cart.discountAmount || discountAmount || 0,
      shippingCost: shippingCost || 0,
      taxAmount: taxAmount || 0
    });

    await order.save();

    // Clear cart after successful order creation
    cart.isActive = false;
    await cart.save();

    // Populate order with product details
    await order.populate({
      path: "items.product",
      select: "name price images brand"
    });

    const response = {
      success: true,
      data: order,
      message: "Order created successfully"
    };

    // Include sessionId in response for anonymous users
    if (!isAuthenticated && orderSessionId) {
      response.sessionId = orderSessionId;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message
    });
  }
};

/**
 * Get user's orders (authenticated or anonymous)
 */
exports.getUserOrders = async (req, res) => {
  try {
    const isAuthenticated = req.isAuthenticated;
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    
    if (isAuthenticated) {
      query.user = req.user.id;
    } else {
      const sessionId = req.sessionId || req.headers['x-session-id'];
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required for anonymous users"
        });
      }
      query.sessionId = sessionId;
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate({
        path: "items.product",
        select: "name price images brand"
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    const response = {
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      },
      message: "Orders retrieved successfully"
    };

    // Include sessionId in response for anonymous users
    if (!isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting user orders:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error: error.message
    });
  }
};

/**
 * Get single order by ID (authenticated or anonymous)
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const isAuthenticated = req.isAuthenticated;

    let query = { _id: orderId };
    
    if (isAuthenticated) {
      query.user = req.user.id;
    } else {
      const sessionId = req.sessionId || req.headers['x-session-id'];
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required for anonymous users"
        });
      }
      query.sessionId = sessionId;
    }

    const order = await Order.findOne(query)
      .populate({
        path: "items.product",
        select: "name price images brand description"
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const response = {
      success: true,
      data: order,
      message: "Order retrieved successfully"
    };

    // Include sessionId in response for anonymous users
    if (!isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting order:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order",
      error: error.message
    });
  }
};

/**
 * Update order status (for admin)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const result = order.updateStatus(status, notes);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    await order.save();

    res.json({
      success: true,
      data: order,
      message: result.message
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message
    });
  }
};

/**
 * Update payment status
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, paymentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const result = order.updatePaymentStatus(paymentStatus, paymentId);
    await order.save();

    res.json({
      success: true,
      data: order,
      message: result.message
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message
    });
  }
};

/**
 * Add tracking information
 */
exports.addTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, estimatedDelivery } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const result = order.addTracking(trackingNumber, estimatedDelivery);
    await order.save();

    res.json({
      success: true,
      data: order,
      message: result.message
    });
  } catch (error) {
    console.error("Error adding tracking:", error);
    res.status(500).json({
      success: false,
      message: "Error adding tracking information",
      error: error.message
    });
  }
};

/**
 * Cancel order (authenticated or anonymous)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const isAuthenticated = req.isAuthenticated;

    let query = { _id: orderId };
    
    if (isAuthenticated) {
      query.user = req.user.id;
    } else {
      const sessionId = req.sessionId || req.headers['x-session-id'];
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required for anonymous users"
        });
      }
      query.sessionId = sessionId;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage"
      });
    }

    const result = order.updateStatus('cancelled', reason);
    await order.save();

    const response = {
      success: true,
      data: order,
      message: "Order cancelled successfully"
    };

    // Include sessionId in response for anonymous users
    if (!isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error.message
    });
  }
};

/**
 * Get order by order number (authenticated or anonymous)
 * Note: For anonymous users, we allow lookup by order number only (no user/session validation)
 * This allows customers to track orders using just the order number
 */
exports.getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const isAuthenticated = req.isAuthenticated;

    let query = { orderNumber };
    
    // For authenticated users, verify ownership
    if (isAuthenticated) {
      query.user = req.user.id;
    }
    // For anonymous users, allow lookup by order number only
    // This is intentional - customers should be able to track orders with just order number

    const order = await Order.findOne(query)
      .populate({
        path: "items.product",
        select: "name price images brand"
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const response = {
      success: true,
      data: order,
      message: "Order retrieved successfully"
    };

    // Include sessionId in response for anonymous users
    if (!isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting order by number:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order",
      error: error.message
    });
  }
};

/**
 * Get order summary/statistics (authenticated or anonymous)
 */
exports.getOrderSummary = async (req, res) => {
  try {
    const isAuthenticated = req.isAuthenticated;

    let matchQuery = {};
    
    if (isAuthenticated) {
      matchQuery.user = req.user.id;
    } else {
      const sessionId = req.sessionId || req.headers['x-session-id'];
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required for anonymous users"
        });
      }
      matchQuery.sessionId = sessionId;
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    };

    const response = {
      success: true,
      data: summary,
      message: "Order summary retrieved successfully"
    };

    // Include sessionId in response for anonymous users
    if (!isAuthenticated && req.sessionId) {
      response.sessionId = req.sessionId;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting order summary:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order summary",
      error: error.message
    });
  }
};

/**
 * Get all orders (admin only)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate({
        path: "items.product",
        select: "name price images brand"
      })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      },
      message: "All orders retrieved successfully"
    });
  } catch (error) {
    console.error("Error getting all orders:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error: error.message
    });
  }
};
