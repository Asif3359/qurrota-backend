const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    image: {
      type: String,
      default: "http://localhost:3000/images/profile-user.png",
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    dateOfBirth: Date,

    phoneNumber: String,
    bio: {
      type: String,
      maxlength: 500,
    },
    preferences: {
      emailNotifications: {
        news: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual('isLocked').get(function(){
    return !! (this.lockUntil && this.lockUntil>Date.now());
})

module.exports = mongoose.model("User", userSchema);
