# EventChron - Production SaaS Platform

A production-ready SaaS platform for managing event timers with count-up functionality, designed for church services, conferences, and meetups.

## Features

### Core Features
- **Event Management**: Create and configure events with custom branding (logo, name, layout)
- **Activity Configuration**: Define ordered activities with time allotments
- **Count-Up Timers**: Track time spent per activity with visual indicators
- **Time Analytics**: Automatically calculate time gained or extra time taken
- **Data Export**: Export event data as JSON or CSV
- **Multi-Tenant**: Support for multiple events per user

### Authentication & Security
- **Google OAuth**: Simple and secure sign in with Google
- **Protected Routes**: All event features require authentication
- **User Isolation**: Users can only access their own events

### Demo Mode
- **Try Before You Sign Up**: Create up to 5 temporary events
- **LocalStorage Only**: Demo events stored locally in browser
- **Full Feature Access**: All timer features available in demo mode

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **NextAuth.js** - Authentication
- **Prisma** - Database ORM
- **SQLite** - Database (development) / PostgreSQL (production)
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 20.11+ (or 20.19+ for latest Prisma)
- npm or yarn
- SQLite (for development) or PostgreSQL (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eventchron
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

   # Google OAuth (Required - for authentication)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

   To generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

   **Required**: Google OAuth setup (authentication requires Google OAuth):
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select existing
   3. Enable Google+ API
   4. Create OAuth 2.0 credentials
   5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   6. Copy Client ID and Client Secret to `.env`

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app
  /(auth)              - Authentication pages (login)
  /(protected)         - Protected routes (dashboard)
  /api                 - API routes
    /auth              - NextAuth routes
    /events            - Event CRUD operations
  /demo                - Demo mode pages
  /events              - Event management pages
  /page.tsx            - Landing page
/components            - Reusable React components
/lib
  - api.ts             - API client functions
  - auth.ts            - NextAuth configuration
  - db.ts              - Prisma client
  - storage.ts         - LocalStorage utilities (for demo mode)
  - types.ts           - TypeScript interfaces
  - utils.ts           - Helper functions
/prisma
  - schema.prisma      - Database schema
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `NEXTAUTH_URL` | Base URL of your application | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes (required for authentication) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes (required for authentication) |

## Database Setup

### Development (SQLite)
The default setup uses SQLite for development. No additional setup required.

### Production (PostgreSQL)
1. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/eventchron"
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Usage

### For Users

1. **Sign In**: Sign in with your Google account
2. **Create Event**: Click "Create New Event" and fill in details
3. **Add Activities**: Define activities with time allotments
4. **Run Event**: Start timers and track time spent
5. **Export Data**: Export results as JSON or CSV

### For Developers

- **API Routes**: All event operations are available via `/api/events`
- **Authentication**: Protected routes use NextAuth.js middleware
- **Database**: Use Prisma Client for database operations
- **Demo Mode**: Uses localStorage with `eventchron_demo_events` key

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Set up environment variables on your hosting platform
4. Configure database (PostgreSQL recommended for production)

## Testing

Run the development server and test:
- Sign in with Google
- Create events
- Run timers
- Export/Import data
- Demo mode (without authentication)

## Troubleshooting

### Database Issues
- Ensure `DATABASE_URL` is set correctly
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` to apply migrations

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- For Google OAuth, verify redirect URI matches

### Build Issues
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Regenerate Prisma client: `npx prisma generate`

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
