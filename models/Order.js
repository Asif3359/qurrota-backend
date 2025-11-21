const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: Schema.Types.ObjectId,
      ref: "Product.variants",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 999,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: true, timestamps: false }
);

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for anonymous orders
      index: true,
      sparse: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash_on_delivery', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'],
      required: true,
    },
    paymentId: {
      type: String,
      sparse: true,
    },
    shippingAddress: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      street: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
    },
    billingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
      email: String,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    shippingCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    trackingNumber: {
      type: String,
      sparse: true,
    },
    estimatedDelivery: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for order number
orderSchema.index({ orderNumber: 1 });

// Index for user orders
orderSchema.index({ user: 1, createdAt: -1 });

// Index for session-based orders (anonymous users)
orderSchema.index({ sessionId: 1, createdAt: -1 });

// Index for status filtering
orderSchema.index({ status: 1, createdAt: -1 });

// Index for payment status
orderSchema.index({ paymentStatus: 1 });

// Index for date range queries
orderSchema.index({ createdAt: -1 });

// Virtual to get total items count
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual to get subtotal
orderSchema.virtual("subtotal").get(function () {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual to get total amount
orderSchema.virtual("total").get(function () {
  return Math.max(0, this.subtotal - this.discountAmount + this.shippingCost + this.taxAmount);
});

// Method to generate order number
orderSchema.statics.generateOrderNumber = function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// Method to update order status
orderSchema.methods.updateStatus = function (newStatus, notes = '') {
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': ['refunded'],
    'cancelled': [],
    'refunded': []
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    return { success: false, message: `Cannot transition from ${this.status} to ${newStatus}` };
  }

  this.status = newStatus;
  
  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancelledReason = notes;
  }

  return { success: true, message: `Order status updated to ${newStatus}` };
};

// Method to update payment status
orderSchema.methods.updatePaymentStatus = function (newPaymentStatus, paymentId = null) {
  this.paymentStatus = newPaymentStatus;
  if (paymentId) {
    this.paymentId = paymentId;
  }
  return { success: true, message: `Payment status updated to ${newPaymentStatus}` };
};

// Method to add tracking information
orderSchema.methods.addTracking = function (trackingNumber, estimatedDelivery = null) {
  this.trackingNumber = trackingNumber;
  if (estimatedDelivery) {
    this.estimatedDelivery = new Date(estimatedDelivery);
  }
  return { success: true, message: 'Tracking information added' };
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
};

// Method to check if order can be refunded
orderSchema.methods.canBeRefunded = function () {
  return this.status === 'delivered' && this.paymentStatus === 'paid';
};

// Pre-save middleware to generate order number
orderSchema.pre('save', function (next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.constructor.generateOrderNumber();
  }
  next();
});

// Pre-save middleware to validate order has either user or sessionId
orderSchema.pre('save', function (next) {
  // Ensure order has either user or sessionId
  if (!this.user && !this.sessionId) {
    return next(new Error("Order must have either a user or sessionId"));
  }
  // If billing address is not provided, use shipping address
  if (!this.billingAddress || Object.keys(this.billingAddress).length === 0) {
    this.billingAddress = { ...this.shippingAddress };
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
