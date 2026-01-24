const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 500,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "My Wishlist",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Ensure one wishlist per user
wishlistSchema.index({ user: 1 }, { unique: true });

// Index for product lookups
wishlistSchema.index({ "products.product": 1 });

// Virtual to get product count
wishlistSchema.virtual("productCount").get(function () {
  return this.products ? this.products.length : 0;
});

// Method to add product to wishlist
wishlistSchema.methods.addProduct = function (productId, notes = "") {
  // Check if product already exists
  const existingProduct = this.products.find(
    (item) => item.product.toString() === productId.toString()
  );
  
  if (existingProduct) {
    return { success: false, message: "Product already in wishlist" };
  }

  this.products.push({
    product: productId,
    notes: notes,
  });

  return { success: true, message: "Product added to wishlist" };
};

// Method to remove product from wishlist
wishlistSchema.methods.removeProduct = function (productId) {
  const initialLength = this.products.length;
  this.products = this.products.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  
  if (this.products.length < initialLength) {
    return { success: true, message: "Product removed from wishlist" };
  }
  
  return { success: false, message: "Product not found in wishlist" };
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function (productId) {
  return this.products.some(
    (item) => item.product.toString() === productId.toString()
  );
};

module.exports = mongoose.model("Wishlist", wishlistSchema);
