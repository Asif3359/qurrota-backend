// controllers/authController.js
const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

dotenv.config();

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email credentials are not set; skipping email send.");
    return;
  }
  await mailTransporter.sendMail({
    from: `Qurrota <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Handles user registration.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationCode = generateCode();

    user = new User({
      name,
      email,
      password: hashedPassword,
      emailVerificationToken: verificationCode,
      emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: "Verify your Qurrota account",
        html: `
          <p>Hi ${name},</p>
          <p>Your verification code is:</p>
          <h2 style="letter-spacing:3px;">${verificationCode}</h2>
          <p>This code expires in 15 minutes.</p>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }

    res.status(201).json({
      message: "User registered successfully. Verification code sent to email.",
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Server error during registration :", error);
    res.status(500).json({
      message: "Server error during registration",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const ismatch = await bcrypt.compare(password, user.password);

    if (!ismatch) {
      user.loginAttempts = user.loginAttempts + 1;
      await user.save();
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is currently inactive.",
      });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        // isVerified: user.isVerified,
      },
    };

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "1h",
    });

    user.lastLogin = new Date();
    user.loginAttempts = 0;

    await user.save();

    res.json({
      message: "Login successfully",
      token,
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Server error during login", error);
    res.status(500).json({
      message: "Server error during login",
    });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }
    if (
      !user.emailVerificationToken ||
      !user.emailVerificationExpires ||
      user.emailVerificationToken !== code ||
      user.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({ message: "Server error verifying email" });
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(200).json({ message: "Email already verified" });
    const verificationCode = generateCode();
    user.emailVerificationToken = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    try {
      await sendEmail({
        to: email,
        subject: "Your Qurrota verification code",
        html: `
          <p>Hi ${user.name},</p>
          <p>Your new verification code is:</p>
          <h2 style="letter-spacing:3px;">${verificationCode}</h2>
          <p>This code expires in 15 minutes.</p>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to resend verification email:", emailErr);
    }
    return res.json({ message: "Verification code resent" });
  } catch (error) {
    console.error("Error resending verification:", error);
    return res.status(500).json({ message: "Server error resending verification" });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal existence
      return res.json({ message: "If an account exists, a reset code has been sent" });
    }
    const resetCode = generateCode();
    user.passwordResetToken = resetCode;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    try {
      await sendEmail({
        to: email,
        subject: "Reset your Qurrota password",
        html: `
          <p>Hi ${user.name},</p>
          <p>Your password reset code is:</p>
          <h2 style="letter-spacing:3px;">${resetCode}</h2>
          <p>This code expires in 15 minutes.</p>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
    }
    return res.json({ message: "If an account exists, a reset code has been sent" });
  } catch (error) {
    console.error("Error initiating password reset:", error);
    return res.status(500).json({ message: "Server error initiating password reset" });
  }
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (
      !user.passwordResetToken ||
      !user.passwordResetExpires ||
      user.passwordResetToken !== code ||
      user.passwordResetExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Server error resetting password" });
  }
};

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
