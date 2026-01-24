const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartItemSchema = new Schema(
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
    addedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: true, timestamps: false }
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for anonymous users
      sparse: true,
    },
    items: [cartItemSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Cart expires in 30 days
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
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
    shippingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
    },
    billingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
    },
  },
  { timestamps: true }
);

// Ensure one active cart per user (for authenticated users)
// Only apply unique constraint when user is an ObjectId (excludes null)
cartSchema.index({ user: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true, user: { $type: "objectId" } } });

// Ensure one active cart per session (for anonymous users)
// Only apply unique constraint when sessionId is a string (excludes null)
cartSchema.index({ sessionId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true, sessionId: { $type: "string" } } });

// Index for product lookups
cartSchema.index({ "items.product": 1 });

// Virtual to get total items count
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual to get subtotal
cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual to get total amount
cartSchema.virtual("total").get(function () {
  return Math.max(0, this.subtotal - this.discountAmount);
});

// Method to add item to cart
cartSchema.methods.addItem = function (productId, quantity = 1, variantId = null, price = null, notes = "") {
  // Check if item already exists (same product and variant)
  const existingItemIndex = this.items.findIndex(
    (item) => 
      item.product.toString() === productId.toString() && 
      (!variantId || item.variant?.toString() === variantId.toString())
  );

  if (existingItemIndex !== -1) {
    // Update quantity of existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].addedAt = new Date();
    if (notes) this.items[existingItemIndex].notes = notes;
    return { success: true, message: "Item quantity updated", item: this.items[existingItemIndex] };
  } else {
    // Add new item
    const newItem = {
      product: productId,
      variant: variantId,
      quantity: quantity,
      price: price,
      notes: notes,
    };
    this.items.push(newItem);
    return { success: true, message: "Item added to cart", item: newItem };
  }
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) {
    return { success: false, message: "Item not found" };
  }

  if (quantity <= 0) {
    return this.removeItem(itemId);
  }

  item.quantity = quantity;
  return { success: true, message: "Item quantity updated", item: item };
};

// Method to remove item from cart
cartSchema.methods.removeItem = function (itemId) {
  const item = this.items.id(itemId);
  if (!item) {
    return { success: false, message: "Item not found" };
  }

  item.remove();
  return { success: true, message: "Item removed from cart" };
};

// Method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.couponCode = undefined;
  this.discountAmount = 0;
  return { success: true, message: "Cart cleared" };
};

// Method to check if product is in cart
cartSchema.methods.hasProduct = function (productId, variantId = null) {
  return this.items.some(
    (item) => 
      item.product.toString() === productId.toString() && 
      (!variantId || item.variant?.toString() === variantId.toString())
  );
};

// Method to get item by product and variant
cartSchema.methods.getItem = function (productId, variantId = null) {
  return this.items.find(
    (item) => 
      item.product.toString() === productId.toString() && 
      (!variantId || item.variant?.toString() === variantId.toString())
  );
};

// Pre-save middleware to validate cart has either user or sessionId
cartSchema.pre("save", function (next) {
  // Ensure cart has either user or sessionId
  if (!this.user && !this.sessionId) {
    return next(new Error("Cart must have either a user or sessionId"));
  }
  // Remove items with invalid quantities
  this.items = this.items.filter(item => item.quantity > 0);
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
