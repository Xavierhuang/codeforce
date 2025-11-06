# Setting Up Default Admin User

CodeForce automatically creates a default admin user when you run the seed script.

## Quick Setup

After setting up your database, run:

```bash
npm run db:seed
```

This will create an admin user with the following default credentials:

- **Email**: `admin@codeforce.com`
- **Password**: `admin123456`
- **Name**: `Admin User`

## Customizing Admin Credentials

You can customize the default admin credentials by setting environment variables before running the seed:

```bash
# In your .env file or export before running seed
export ADMIN_EMAIL="your-email@example.com"
export ADMIN_PASSWORD="your-secure-password"
export ADMIN_NAME="Your Name"

npm run db:seed
```

Or add to your `.env` file:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Name
```

## Important Security Notes

⚠️ **Always change the default password after first login!**

1. Log in with the default credentials
2. Go to your profile settings
3. Change your password immediately

## Accessing Admin Dashboard

Once logged in as admin:

1. Go to `/dashboard`
2. Click on "Go to Admin Panel" card
3. Or navigate directly to `/admin`

## What the Admin Can Do

- View platform statistics
- Verify/reject developer accounts
- View all users and their status
- View all tasks on the platform
- Manage platform operations

## Re-running Seed

The seed script is safe to run multiple times. It will:
- ✅ Check if admin user already exists
- ✅ Skip creation if admin exists
- ✅ Update existing user to admin role if needed

## Troubleshooting

If you need to manually create an admin user:

1. Connect to your database
2. Find a user's ID
3. Update their role:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

Or use Prisma Studio:

```bash
npm run db:studio
```

Then edit a user and change their role to `ADMIN`.

