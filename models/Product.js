const mongoose = require("mongoose");
const Schema = mongoose.Schema;

function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    publicId: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const variantSchema = new Schema(
  {
    name: { type: String, trim: true },
    sku: { type: String, trim: true },
    price: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    images: [imageSchema],
    attributes: { type: Map, of: String }, // e.g., size: "M", color: "Red"
    isActive: { type: Boolean, default: true },
  },
  { _id: false, timestamps: false }
);

const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, trim: true },
    comment: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true, timestamps: false }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true },

    sku: { type: String, trim: true, sparse: true, unique: true },
    barcode: { type: String, trim: true },
    brand: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    categories: [{ type: String, trim: true }],

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD", uppercase: true },
    taxClass: { type: String, trim: true },

    stock: { type: Number, min: 0, default: 0 },
    trackInventory: { type: Boolean, default: true },
    variants: [variantSchema],

    images: [imageSchema],

    ratingAverage: { type: Number, min: 0, max: 5, default: 3 },
    ratingCount: { type: Number, min: 0, default: 3 },
    reviews: [reviewSchema],

    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, enum: ["cm", "in"], default: "cm" },
    },

    shippingRequired: { type: Boolean, default: true },

    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    visibility: { type: String, enum: ["public", "private", "hidden"], default: "public" },

    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }],
    },

    vendor: { type: String, trim: true },
    countryOfOrigin: { type: String, trim: true },
  },
  { timestamps: true }
);

productSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

productSchema.virtual("isInStock").get(function () {
  const baseInStock = (this.stock || 0) > 0;
  if (baseInStock) return true;
  if (Array.isArray(this.variants)) {
    return this.variants.some((v) => (v && v.stock || 0) > 0);
  }
  return false;
});

productSchema.index({ name: "text", description: "text", brand: "text", tags: "text" }, {
  weights: { name: 10, brand: 5, description: 3, tags: 2 },
  name: "product_text_index",
});

productSchema.index({ "variants.sku": 1 }, { unique: false, sparse: true, name: "variant_sku_index" });
productSchema.index({ brand: 1, price: 1 }, { name: "brand_price_index" });
productSchema.index({ isPublished: 1, isActive: 1, updatedAt: -1 }, { name: "visibility_updated_index" });

module.exports = mongoose.model("Product", productSchema);
