// Test script for email functionality with different providers
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Email transporter configuration with support for multiple providers
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  
  if (emailService === 'maileroo') {
    return nodemailer.createTransport({
      host: 'smtp.maileroo.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAILEROO_USER,
        pass: process.env.MAILEROO_PASS,
      },
    });
  } else if (emailService === 'gmail') {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App password from your Google account
      },
    });
  } else {
    // Fallback to Gmail if no service specified
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
};

// Test email function
const testEmail = async () => {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  
  console.log(`🧪 Testing email with ${emailService.toUpperCase()}...`);
  
  // Check credentials based on the email service
  if (emailService === 'maileroo') {
    if (!process.env.MAILEROO_USER || !process.env.MAILEROO_PASS) {
      console.warn("⚠️ Maileroo credentials are not set; skipping email send.");
      console.log("Please set MAILEROO_USER and MAILEROO_PASS environment variables.");
      return;
    }
  } else {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ Email credentials are not set; skipping email send.");
      console.log("Please set EMAIL_USER and EMAIL_PASS environment variables.");
      return;
    }
  }

  const transporter = createTransporter();
  
  // Use appropriate sender email based on service
  const senderEmail = emailService === 'maileroo' 
    ? process.env.MAILEROO_USER 
    : process.env.EMAIL_USER;

  try {
    // Test connection
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");
    
    // Send test email
    const testEmail = {
      from: `"Qurrota Test" <${senderEmail}>`,
      to: process.env.TEST_EMAIL || senderEmail, // Send to yourself if no test email specified
      subject: "🧪 Email Test - Qurrota Backend",
      html: `
        <h2>Email Test Successful!</h2>
        <p>This is a test email from your Qurrota backend.</p>
        <p><strong>Email Service:</strong> ${emailService.toUpperCase()}</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <p>If you received this email, your email configuration is working correctly! 🎉</p>
      `,
    };

    await transporter.sendMail(testEmail);
    console.log(`✅ Test email sent successfully to ${testEmail.to}`);
    console.log(`📧 Email service: ${emailService.toUpperCase()}`);
    console.log(`📧 Sender: ${senderEmail}`);
    
  } catch (error) {
    console.error("❌ Failed to send test email:", error.message);
    console.error("Full error:", error);
  }
};

// Run the test
testEmail();
