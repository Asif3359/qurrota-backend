# Email Configuration Setup

## Environment Variables Required

Add these environment variables to your production environment (Vercel, Render, etc.):

```bash
# Gmail SMTP Configuration (Default)
EMAIL_SERVICE=gmail  # Optional: defaults to gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password  # Use App Password, not regular password
NODE_ENV=production  # Set to production for optimized email settings

# Maileroo SMTP Configuration
EMAIL_SERVICE=maileroo
MAILEROO_USER=your-email@yourdomain.com  # Your verified domain email
MAILEROO_PASS=your-maileroo-smtp-password

# Alternative: Outlook/Hotmail Configuration
# EMAIL_SERVICE=outlook
# EMAIL_USER=your-email@outlook.com
# EMAIL_PASS=your-password
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as `EMAIL_PASS` (not your regular Gmail password)

## Maileroo Setup Instructions

1. **Sign up for Maileroo**:
   - Visit [maileroo.com](https://maileroo.com)
   - Create a free account
   - Verify your email address

2. **Add and Verify Your Domain**:
   - In your Maileroo dashboard, go to "Domains"
   - Click "Add Domain" and enter your domain name
   - Follow the DNS verification process:
     - Add the required TXT records to your domain's DNS settings
     - Wait for verification (usually takes a few minutes)

3. **Create SMTP Account**:
   - Once your domain is verified, go to "Domains" → "Overview"
   - Click "Create an SMTP Account"
   - Choose an alias for your sending email (e.g., `noreply@yourdomain.com`)
   - Save the generated SMTP credentials

4. **Configure Environment Variables**:
   ```bash
   EMAIL_SERVICE=maileroo
   MAILEROO_USER=noreply@yourdomain.com  # Your SMTP username
   MAILEROO_PASS=your-generated-smtp-password  # Your SMTP password
   ```

5. **Benefits of Maileroo**:
   - Higher email deliverability rates
   - Better reputation management
   - Professional email sending
   - Free tier available
   - No daily sending limits on free tier

## Production Deployment

### For Vercel:
1. Go to your project dashboard
2. Settings → Environment Variables
3. Add the variables above

### For Render:
1. Go to your service dashboard
2. Environment tab
3. Add the variables above

## Troubleshooting

### Common Issues:
1. **Connection Timeout**: The new configuration includes proper timeout settings and retry logic
2. **Authentication Failed**: 
   - For Gmail: Make sure you're using an App Password, not your regular password
   - For Maileroo: Verify your SMTP credentials are correct and domain is verified
3. **TLS Issues**: The configuration includes `rejectUnauthorized: false` to handle TLS issues
4. **Maileroo Domain Verification**: Ensure your domain is properly verified in Maileroo dashboard
5. **SMTP Account Issues**: Make sure you've created an SMTP account in Maileroo after domain verification

### Testing Email Functionality:
The system now includes:
- Connection verification before sending emails
- Retry logic with exponential backoff (3 attempts)
- Proper timeout configurations
- Fallback email service options
- Support for multiple email providers (Gmail, Maileroo, Outlook)

### Switching Between Email Providers:
To switch from Gmail to Maileroo:
1. Set `EMAIL_SERVICE=maileroo` in your environment variables
2. Add your Maileroo credentials (`MAILEROO_USER` and `MAILEROO_PASS`)
3. Restart your application

To switch back to Gmail:
1. Set `EMAIL_SERVICE=gmail` (or remove the variable to use default)
2. Ensure `EMAIL_USER` and `EMAIL_PASS` are set
3. Restart your application

## Alternative Email Services

If Gmail continues to have issues, you can switch to:

### Outlook/Hotmail:
```bash
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### SendGrid (Recommended for production):
```bash
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

## Monitoring

Check your application logs for:
- `SMTP connection verified successfully` - Connection is working
- `Email sent successfully to [email]` - Email was sent
- `Email send attempt X failed` - Retry attempts
- `Failed to send email after 3 attempts` - All retries failed
