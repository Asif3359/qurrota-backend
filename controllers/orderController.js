const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

/**
 * Create order from cart
 */
/**
 * Create order from cart
 */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      paymentMethod, 
      shippingAddress, 
      billingAddress, 
      notes,
      couponCode,
      discountAmount,
      shippingCost,
      taxAmount
    } = req.body;

    // Get user's active cart
    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: "items.product",
        select: "name price images brand stock isActive isPublished",
        match: { isActive: true, isPublished: true }
      });

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

    const order = new Order({
      user: userId,
      orderNumber, // Explicitly set the order number
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

    // Clear user's cart after successful order creation
    cart.isActive = false;
    await cart.save();

    // Populate order with product details
    await order.populate({
      path: "items.product",
      select: "name price images brand"
    });

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully"
    });
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
 * Get user's orders
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: userId };
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
      message: "Orders retrieved successfully"
    });
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
 * Get single order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, user: userId })
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

    res.json({
      success: true,
      data: order,
      message: "Order retrieved successfully"
    });
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
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, user: userId });
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

    res.json({
      success: true,
      data: order,
      message: "Order cancelled successfully"
    });
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
 * Get order by order number
 */
exports.getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ orderNumber, user: userId })
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

    res.json({
      success: true,
      data: order,
      message: "Order retrieved successfully"
    });
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
 * Get order summary/statistics
 */
exports.getOrderSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Order.aggregate([
      { $match: { user: userId } },
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

    res.json({
      success: true,
      data: summary,
      message: "Order summary retrieved successfully"
    });
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
