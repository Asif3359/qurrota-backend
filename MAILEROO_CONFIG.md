# Maileroo Configuration for Qurrota Backend

## Your Maileroo Credentials

Based on your Maileroo dashboard, here are your credentials:

```
EMAIL_SERVICE=maileroo
MAILEROO_USER=asif3359@710bf17dc92cc3b3.maileroo.org
MAILEROO_PASS=e0b60ee8de29ce6ad4a89496
```

## Environment Variables Setup

Add these to your `.env` file:

```bash
# Email Service Configuration
EMAIL_SERVICE=maileroo
MAILEROO_USER=asif3359@710bf17dc92cc3b3.maileroo.org
MAILEROO_PASS=e0b60ee8de29ce6ad4a89496

# Optional: For testing emails
TEST_EMAIL=your-test-email@example.com
```

## Testing Your Configuration

1. **Run the test script**:
   ```bash
   node test-email.js
   ```

2. **Expected output**:
   ```
   🧪 Testing email with MAILEROO...
   ✅ SMTP connection verified successfully
   ✅ Test email sent successfully to your-email@example.com
   📧 Email service: MAILEROO
   📧 Sender: asif3359@710bf17dc92cc3b3.maileroo.org
   ```

## Production Deployment

### For Vercel:
1. Go to your project dashboard
2. Settings → Environment Variables
3. Add the variables above

### For Render:
1. Go to your service dashboard
2. Environment tab
3. Add the variables above

### For Railway:
1. Go to your project dashboard
2. Variables tab
3. Add the variables above

## Your Sending Key (Alternative Method)

You also have a **Sending Key** for API usage:
```
5f0ea8981ad50f587d49ea8cdd0be0a33509bc6dc85ea6b07231e4e9ebb6a4e5
```

This can be used for direct API calls instead of SMTP if you prefer.

## Next Steps

1. Add the environment variables to your `.env` file
2. Test the configuration with `node test-email.js`
3. Deploy with the environment variables set
4. Your email system is now ready to use Maileroo!

## Troubleshooting

If you encounter issues:
- Make sure your domain is verified in Maileroo
- Check that the SMTP account is created
- Verify the credentials are correct
- Check the Maileroo dashboard for any restrictions
