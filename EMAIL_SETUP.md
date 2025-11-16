# Email Setup Guide for Receipt Emails

This guide will help you set up email sending for receipt emails using SendGrid.

## Quick Setup (Recommended: SendGrid)

### Step 1: Create a SendGrid Account

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Create an API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `Skillyy Receipt Emails`
4. Select **Full Access** or **Restricted Access** with **Mail Send** permission
5. Click **Create & View**
6. **Copy the API key immediately** (you won't see it again!)

### Step 3: Verify Your Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Email**: `noreply@skillyy.com` (or your preferred email)
   - **From Name**: `Skillyy`
   - **Reply To**: `support@skillyy.com`
   - **Company Address**: Your business address
4. Check your email and click the verification link

### Step 4: Update Environment Variables

Add these to your `.env` file on the server:

```bash
SENDGRID_API_KEY="SG.your-api-key-here"
SENDGRID_FROM_EMAIL="noreply@skillyy.com"
```

### Step 5: Restart the Application

After updating the environment variables, restart the application:

```bash
pm2 restart codeforce
```

## Alternative: SMTP Setup (Gmail, etc.)

If you prefer to use SMTP instead of SendGrid:

1. For Gmail:
   - Enable 2-factor authentication
   - Generate an App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Use these settings:

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="your-email@gmail.com"
```

2. For other providers, check their SMTP settings documentation.

## Testing

After setup, test by making a test transaction. Check the server logs:

```bash
pm2 logs codeforce | grep -i "receipt email"
```

You should see: `Receipt email sent successfully to [email]`

## Troubleshooting

- **Emails not sending**: Check that `SENDGRID_API_KEY` is set correctly
- **Authentication errors**: Verify your sender email in SendGrid
- **Rate limits**: Free SendGrid accounts have 100 emails/day limit
- **Check logs**: `pm2 logs codeforce` for detailed error messages

## Production Recommendations

For production:
- Upgrade SendGrid plan for higher limits
- Set up domain authentication (better deliverability)
- Monitor email delivery in SendGrid dashboard
- Set up webhooks for bounce/spam reports


