import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'finora-dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || NEXTAUTH_SECRET;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          kycStatus: user.kycStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.kycStatus = (user as any).kycStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        (session.user as any).kycStatus = token.kycStatus as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
};

export function signToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

/**
 * Robust session helper that resolves user from NextAuth session or session cookie
 */
export async function getCurrentUser() {
  try {
    // 1. Try NextAuth session
    const session = await getServerSession(authOptions);
    if (session?.user && (session.user as any).id) {
      const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
      });
      if (user) return user;
    }

    // 2. Try JWT fallback from cookie or Authorization header
    const cookieStore = cookies();
    let token = cookieStore.get('finora_session')?.value || cookieStore.get('next-auth.session-token')?.value;

    if (!token) {
      const headerStore = headers();
      const authHeader = headerStore.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });
        if (user) return user;
      }
    }

    // 3. Fallback: if in development and exactly 1 user exists, allow fallback if needed or return null
    return null;
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
      return null;
    }
    console.error('[Auth] Error in getCurrentUser:', err);
    return null;
  }
}
