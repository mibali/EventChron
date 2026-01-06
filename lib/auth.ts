import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './db';

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not set in environment variables');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for authentication');
}

const config: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required for NextAuth v5 in production environments
  // Using JWT strategy, so we don't need PrismaAdapter
  // We'll handle user creation/updates manually in the providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/',
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // Handle Google OAuth user creation
      if (account?.provider === 'google' && user.email) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || (profile as any)?.name || user.email.split('@')[0],
                image: user.image || (profile as any)?.picture || null,
                emailVerified: new Date(),
              },
            });
          } else if (!dbUser.image && (user.image || (profile as any)?.picture)) {
            // Update image if missing
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { image: user.image || (profile as any)?.picture || null },
            });
          }

          // Update user object with database ID
          user.id = dbUser.id;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          // Don't block sign-in if there's an error, but log it
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && user.id) {
        token.id = user.id;
        token.email = user.email || undefined;
        token.name = user.name || undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string;
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (token.name) {
          session.user.name = token.name as string | null;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
export const authOptions = config;

