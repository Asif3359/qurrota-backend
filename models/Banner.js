const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    publicId: { type: String },
  },
  { _id: false }
);

const bannerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    image: {
      type: imageSchema,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: function() {
        return !this.isDefault; // Required only if not default
      },
    },
    endDate: {
      type: Date,
      required: function() {
        return !this.isDefault; // Required only if not default
      },
      validate: {
        validator: function(v) {
          if (this.isDefault) return true;
          return !this.startDate || v > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    link: {
      type: String,
      trim: true,
    },
    target: {
      type: String,
      enum: ['_self', '_blank'],
      default: '_self',
    },
  },
  { timestamps: true }
);

// Virtual to check if banner is currently active (within date range)
bannerSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  if (this.isDefault) return true;
  
  const now = new Date();
  const start = this.startDate ? new Date(this.startDate) : null;
  const end = this.endDate ? new Date(this.endDate) : null;
  
  if (!start || !end) return false;
  
  return now >= start && now <= end;
});

// Index for querying active banners
bannerSchema.index({ isActive: 1, isDefault: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ isDefault: 1 });
bannerSchema.index({ order: 1 });

// Static method to get active banners or defaults (returns 3-4 banners)
bannerSchema.statics.getActiveBanners = async function() {
  const now = new Date();
  
  // First, try to find active banners within date range (limit 4)
  const activeBanners = await this.find({
    isActive: true,
    isDefault: false,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ order: 1, createdAt: -1 }).limit(4);
  
  // If we have 3-4 active banners, return them
  if (activeBanners.length >= 3) {
    return activeBanners;
  }
  
  // If we have some active banners but less than 3, fill with defaults
  if (activeBanners.length > 0 && activeBanners.length < 3) {
    const needed = 3 - activeBanners.length;
    const defaultBanners = await this.find({
      isActive: true,
      isDefault: true
    }).sort({ order: 1, createdAt: -1 }).limit(needed);
    
    return [...activeBanners, ...defaultBanners].slice(0, 4);
  }
  
  // Otherwise, return default banners (3-4)
  const defaultBanners = await this.find({
    isActive: true,
    isDefault: true
  }).sort({ order: 1, createdAt: -1 }).limit(4);
  
  return defaultBanners;
};

module.exports = mongoose.model("Banner", bannerSchema);
