# Email Configuration Setup

## Environment Variables Required

Add these environment variables to your production environment (Vercel, Render, etc.):

```bash
# Gmail SMTP Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password  # Use App Password, not regular password
EMAIL_SERVICE=gmail  # Optional: defaults to gmail
NODE_ENV=production  # Set to production for optimized email settings

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
2. **Authentication Failed**: Make sure you're using an App Password, not your regular password
3. **TLS Issues**: The configuration includes `rejectUnauthorized: false` to handle TLS issues

### Testing Email Functionality:
The system now includes:
- Connection verification before sending emails
- Retry logic with exponential backoff (3 attempts)
- Proper timeout configurations
- Fallback email service options

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
