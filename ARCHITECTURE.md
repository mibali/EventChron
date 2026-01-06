# EventChron Architecture Plan

## Current State Analysis

### Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: LocalStorage only (client-side)
- **State Management**: React useState/useEffect (no global state)

### Existing Features
✅ Event Management (create, edit, delete, duplicate)
✅ Activity Configuration (add, remove, reorder, edit)
✅ Timer System (count-up with visual indicators)
✅ Export/Import (JSON, CSV)
✅ Search, Filter, Pagination
✅ Logo upload with compression
✅ Full-screen mode

### Current File Structure
```
/app
  /events/[id]/page.tsx    - Event detail/timer page
  /events/new/page.tsx     - Create event page
  /page.tsx                - Events list (home)
/components
  - Timer.tsx
  - ActivityForm.tsx
  - EditableActivityList.tsx
  - ConfirmationModal.tsx
  - Footer.tsx
/lib
  - storage.ts             - LocalStorage operations
  - types.ts               - TypeScript interfaces
  - utils.ts               - Helper functions
  - export.ts              - Export utilities
```

## Proposed Architecture

### New Stack Additions
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Database**: Prisma + PostgreSQL (or SQLite for dev)
- **API Routes**: Next.js API routes
- **Session Management**: NextAuth.js sessions

### New File Structure
```
/app
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(protected)
    /dashboard/page.tsx      - Events list (moved from /)
    /events/[id]/page.tsx    - Event detail
    /events/new/page.tsx     - Create event
  /demo/page.tsx             - Demo mode
  /api
    /auth/[...nextauth]/route.ts
    /events/route.ts         - GET, POST
    /events/[id]/route.ts    - GET, PUT, DELETE
  /page.tsx                  - Landing page
/components
  - auth/                    - Auth components
  - landing/                 - Landing page components
/lib
  - auth.ts                  - Auth config
  - db.ts                    - Prisma client
  - api.ts                   - API client functions
  - storage.ts               - Refactored (API + cache)
/prisma
  - schema.prisma            - Database schema
```

### Data Model

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  events        Event[]
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type             String
  provider         String
  providerAccountId String
  refresh_token    String?
  access_token     String?
  expires_at       Int?
  token_type       String?
  scope            String?
  id_token         String?
  session_state    String?
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
}

model Event {
  id            String    @id @default(cuid())
  eventName     String
  eventDate     DateTime
  logoUrl       String?
  logoAlignment String    @default("center")
  userId        String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  activities    Activity[]
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([eventDate])
}

model Activity {
  id              String   @id @default(cuid())
  activityName    String
  timeAllotted    Int      // seconds
  timeSpent       Int?
  extraTimeTaken  Int?
  timeGained      Int?
  isCompleted     Boolean  @default(false)
  isActive        Boolean  @default(false)
  order           Int      @default(0)
  eventId         String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([eventId])
}
```

## Implementation Phases

### Phase 1: Foundation (Auth + Database)
1. Install dependencies (NextAuth, Prisma, etc.)
2. Set up Prisma schema
3. Configure NextAuth.js
4. Create auth pages (login, signup)
5. Set up database connection

### Phase 2: API Layer
1. Create API routes for events CRUD
2. Add authentication middleware
3. Implement user isolation

### Phase 3: Storage Refactor
1. Refactor storage.ts to use API
2. Add localStorage caching layer
3. Update all components to use new storage

### Phase 4: Landing Page
1. Create landing page with hero section
2. Add features section
3. Implement demo mode
4. Add pricing/FAQ sections

### Phase 5: Protected Routes
1. Add route protection middleware
2. Redirect unauthenticated users
3. Handle demo mode routing

### Phase 6: Polish
1. Error handling
2. Loading states
3. Empty states
4. Update README

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/eventchron"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

