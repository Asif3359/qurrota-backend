// controllers/authController.js
const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { Resend } = require("resend");

dotenv.config();

// ✅ Production Email Configuration with Resend
const initializeResend = () => {
  // Check if Resend API key is available
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ Resend API key is missing:");
    console.error(
      "   RESEND_API_KEY:",
      process.env.RESEND_API_KEY ? "Set" : "Not set"
    );
    console.error("   Please set RESEND_API_KEY in your environment variables");
    return null;
  }

  console.log("📧 Initializing Resend email service...");

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend initialized successfully");
    return resend;
  } catch (error) {
    console.error("❌ Failed to initialize Resend:", error.message);
    return null;
  }
};

// Initialize Resend
const resend = initializeResend();

// ✅ Production Send Email helper using Resend
const sendEmail = async ({ to, subject, html }) => {
  // Check if Resend service is available
  if (!resend) {
    console.warn("⚠️ Resend service unavailable - skipping email send");
    return { success: false, error: "Resend service not configured" };
  }

  try {
    console.log(`📤 Attempting to send email to: ${to}`);

    // Production: Send to actual recipient
    // Development: Send to verified email for testing
    const isProduction = process.env.NODE_ENV === "production";
    const actualTo = isProduction ? to : 'asifahammednishst@gmail.com'; // Send to verified email in development

    console.log(`🔍 Debug Info:`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   isProduction: ${isProduction}`);
    console.log(`   Original recipient: ${to}`);
    console.log(`   Actual recipient: ${actualTo}`);

    if (!isProduction) {
      console.log(
        `🧪 Development mode: Redirecting email from ${to} to ${actualTo}`
      );
    }

    // Use environment-based email configuration
    const fromEmail = process.env.EMAIL_FROM || "Qurrota <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from: fromEmail,
      to: [actualTo],
      subject,
      html,
    });

    console.log(
      `✅ Email sent successfully to ${actualTo}, Message ID: ${result.data?.id}`
    );

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);

    // Specific error handling for Resend
    if (error.message?.includes("Invalid API key")) {
      console.error("🔐 Invalid Resend API key - check your RESEND_API_KEY");
    } else if (error.message?.includes("Invalid email")) {
      console.error("📧 Invalid email address format");
    } else if (error.message?.includes("Rate limit")) {
      console.error(
        "⏱️ Rate limit exceeded - please wait before sending more emails"
      );
    } else if (error.message?.includes("You can only send testing emails")) {
      console.error(
        "🧪 Testing mode: Only verified emails allowed. Set NODE_ENV=production for full access"
      );
    }

    return { success: false, error: error.message };
  }
};

// ✅ Generate 6-digit code
const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ✅ Signup controller
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check for existing user
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = generateCode();

    // Create new user
    user = new User({
      name,
      email,
      password: hashedPassword,
      emailVerificationToken: verificationCode,
      emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    });

    await user.save();

    // Send verification email
    const emailResult = await sendEmail({
      to: email,
      subject: "Verify your Qurrota account",
      html: `
        <p>Hi ${name},</p>
        <p>Your verification code is:</p>
        <h2 style="letter-spacing:3px;">${verificationCode}</h2>
        <p>This code expires in 15 minutes.</p>
      `,
    });

    // Response
    if (emailResult.success) {
      res.status(201).json({
        message:
          "User registered successfully. Verification code sent to email.",
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
    } else {
      // User created but email failed
      res.status(201).json({
        message:
          "User registered successfully. But failed to send verification email. Please use resend verification.",
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
        warning: "Verification email failed to send",
      });
    }
  } catch (error) {
    console.error("Server error during registration:", error);
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
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
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
    if (user.isVerified)
      return res.status(200).json({ message: "Email already verified" });

    const verificationCode = generateCode();
    user.emailVerificationToken = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const emailResult = await sendEmail({
      to: email,
      subject: "Your Qurrota verification code",
      html: `
        <p>Hi ${user.name},</p>
        <p>Your new verification code is:</p>
        <h2 style="letter-spacing:3px;">${verificationCode}</h2>
        <p>This code expires in 15 minutes.</p>
      `,
    });

    if (emailResult.success) {
      return res.json({ message: "Verification code resent" });
    } else {
      return res.status(500).json({
        message: "Verification code generated but failed to send email",
        error: emailResult.error,
      });
    }
  } catch (error) {
    console.error("Error resending verification:", error);
    return res
      .status(500)
      .json({ message: "Server error resending verification" });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal existence
      return res.json({
        message: "If an account exists, a reset code has been sent",
      });
    }

    const resetCode = generateCode();
    user.passwordResetToken = resetCode;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const emailResult = await sendEmail({
      to: email,
      subject: "Reset your Qurrota password",
      html: `
        <p>Hi ${user.name},</p>
        <p>Your password reset code is:</p>
        <h2 style="letter-spacing:3px;">${resetCode}</h2>
        <p>This code expires in 15 minutes.</p>
      `,
    });

    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
    }

    return res.json({
      message: "If an account exists, a reset code has been sent",
    });
  } catch (error) {
    console.error("Error initiating password reset:", error);
    return res
      .status(500)
      .json({ message: "Server error initiating password reset" });
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
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
