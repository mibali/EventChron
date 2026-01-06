# Environment Setup Instructions

## Critical: You MUST set up your .env file!

The 500 error you're seeing is likely because `NEXTAUTH_SECRET` is missing.

### Steps to Fix:

1. **Create or update your `.env` file** in the root directory with:

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# NextAuth - REQUIRED!
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (Optional - only if you want Google sign-in)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

2. **Generate NEXTAUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as the value for `NEXTAUTH_SECRET` in your `.env` file.

3. **Restart your dev server** after creating/updating `.env`:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

### Quick Fix Command:

Run this in your terminal (from the project root):

```bash
# Generate secret and create .env if it doesn't exist
echo 'DATABASE_URL="file:./dev.db"' > .env
echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env
echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
```

Then restart your dev server!

