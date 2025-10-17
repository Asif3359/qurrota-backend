// controllers/contactController.js
const dotenv = require("dotenv");
const { Resend } = require("resend");

dotenv.config();

// Initialize Resend similarly to authController
const initializeResend = () => {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY is not set");
    return null;
  }
  try {
    return new Resend(process.env.RESEND_API_KEY);
  } catch (error) {
    console.error("❌ Failed to initialize Resend:", error.message);
    return null;
  }
};

const resend = initializeResend();

// POST /api/contact
const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!resend) {
    return res.status(500).json({ message: "Email service not configured" });
  }

  try {
    const isProduction = process.env.NODE_ENV === "production";
    const fromEmail = process.env.EMAIL_FROM || "Qurrota <onboarding@resend.dev>";

    // Where to receive contact emails
    const recipient = process.env.EMAIL_USER;
    if (!recipient) {
      return res.status(500).json({ message: "No contact recipient configured" });
    }

    const html = `
      <div>
        <h2>New contact message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-line">${message}</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: [recipient],
      subject: `[Contact] ${subject}`,
      html,
      reply_to: email,
    });

    return res.status(200).json({
      message: "Message sent successfully",
      id: result.data?.id,
      environment: isProduction ? "production" : "development",
    });
  } catch (error) {
    console.error("❌ Failed to send contact message:", error.message);
    return res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

module.exports = { sendContactMessage };


