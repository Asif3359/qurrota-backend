// Email service with fallback options
require('dotenv').config();
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.resend = null;
    this.smtpTransporter = null;
    this.initializeServices();
  }

  initializeServices() {
    // Initialize Resend
    if (process.env.RESEND_API_KEY) {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        console.log('✅ Resend initialized');
      } catch (error) {
        console.error('❌ Resend initialization failed:', error.message);
      }
    }

    // Initialize SMTP as fallback
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        this.smtpTransporter = nodemailer.createTransporter({
          service: "Gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        console.log('✅ SMTP fallback initialized');
      } catch (error) {
        console.error('❌ SMTP initialization failed:', error.message);
      }
    }
  }

  async sendEmail({ to, subject, html }) {
    // Try Resend first (for production)
    if (this.resend && process.env.NODE_ENV === 'production') {
      try {
        const result = await this.resend.emails.send({
          from: 'Qurrota <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        });
        console.log(`✅ Email sent via Resend to ${to}`);
        return { success: true, messageId: result.data?.id, method: 'resend' };
      } catch (error) {
        console.error('❌ Resend failed, trying SMTP fallback:', error.message);
      }
    }

    // Fallback to SMTP (for development)
    if (this.smtpTransporter) {
      try {
        const result = await this.smtpTransporter.sendMail({
          from: `"Qurrota" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        });
        console.log(`✅ Email sent via SMTP to ${to}`);
        return { success: true, messageId: result.messageId, method: 'smtp' };
      } catch (error) {
        console.error('❌ SMTP failed:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: false, error: 'No email service available' };
  }
}

module.exports = new EmailService();
