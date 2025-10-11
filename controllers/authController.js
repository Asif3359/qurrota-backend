// controllers/authController.js
const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

dotenv.config();

// Create email transporter with fallback options
const createMailTransporter = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Production-optimized timeouts
    connectionTimeout: isProduction ? 30000 : 60000, // 30s in production, 60s in dev
    greetingTimeout: isProduction ? 15000 : 30000, // 15s in production, 30s in dev
    socketTimeout: isProduction ? 30000 : 60000, // 30s in production, 60s in dev
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    // Additional production settings
    pool: isProduction, // Use connection pooling in production
    maxConnections: isProduction ? 5 : 1,
    maxMessages: isProduction ? 100 : 1,
    rateDelta: isProduction ? 20000 : 1000, // 20s between batches in production
    rateLimit: isProduction ? 5 : 1 // 5 emails per batch in production
  };

  return nodemailer.createTransport(config);
};

const mailTransporter = createMailTransporter();

// Verify SMTP connection
const verifySMTPConnection = async () => {
  try {
    await mailTransporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error);
    return false;
  }
};

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email credentials are not set; skipping email send.");
    return;
  }
  
  // Verify connection first (but don't fail silently in production)
  const isConnected = await verifySMTPConnection();
  if (!isConnected) {
    console.error('SMTP connection failed, skipping email send');
    // In production, you might want to queue the email for later retry
    // For now, we'll continue with the retry logic below
    console.log('Attempting to send email despite connection verification failure...');
  }
  
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await mailTransporter.sendMail({
        from: `Qurrota <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`Email sent successfully to ${to}`);
      return; // Success, exit the function
    } catch (error) {
      retryCount++;
      console.error(`Email send attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error(`Failed to send email after ${maxRetries} attempts:`, error);
        throw error; // Re-throw the error after all retries failed
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
        id: user._id,
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
        id: user._id,
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
