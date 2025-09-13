// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth';
import type { LoggerInstance } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LineProvider from 'next-auth/providers/line'; // LINEプロバイダーをインポート
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

// 環境変数の検証
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please check your .env file and ensure all required variables are set.');
}

const providers = [] as any[];

// Google Provider（環境変数が設定されている場合のみ）
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
} else {
  console.warn('Google OAuth credentials not found. Google sign-in will be disabled.');
}

// LINE Provider（環境変数が設定されている場合のみ）
if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
  providers.push(
    LineProvider({
      clientId: process.env.LINE_CHANNEL_ID,
      clientSecret: process.env.LINE_CHANNEL_SECRET,
    })
  );
} else {
  console.warn('LINE OAuth credentials not found. LINE sign-in will be disabled.');
}

// Diagnostics: log configured providers and key envs
try {
  const ids = providers.map((p: any) => p?.id).filter(Boolean)
  console.log('[auth-config] providers:', ids, 'env', {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
  })
} catch (e) {
  console.warn('[auth-config] diag failed', e)
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// DBを使わない開発モードを許可（JWTのみ）
// AUTH_USE_DB=false または DATABASE_URL 未設定時はアダプターを無効化
const useDb = (process.env.AUTH_USE_DB ?? 'true').toLowerCase() !== 'false' && !!process.env.DATABASE_URL

// Verbose logger for investigation (prints in production when NEXTAUTH_DEBUG=true)
const logger: Partial<LoggerInstance> = {
  error: (...args) => console.error('[next-auth][error]', ...args),
  warn:  (...args) => console.warn('[next-auth][warn]', ...args),
  debug: (...args) => console.log('[next-auth][debug]', ...args),
}

const handler = NextAuth({
  ...(useDb ? { adapter: PrismaAdapter(prisma) } : {}),
  providers,
  logger,
  cookies: {
    // セッショントークンをサブドメインでも共有できるようにする
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        // ルートドメイン配下で共有
        domain: process.env.COOKIE_DOMAIN || '.uchinokiroku.com',
      },
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // pages はデフォルトを使用（API ドメインでのフローを安定化）
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // 相対パスはAPI自身へ
      if (url.startsWith('/')) return `${baseUrl}${url}`

      const origin = new URL(url).origin
      // API自身 or フロントのオリジンは許可
      if (origin === baseUrl || origin === new URL(FRONTEND_URL).origin) return url

      // それ以外はAPIのベースへ
      return baseUrl
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Force debug when NEXTAUTH_DEBUG=true (even in production)
  debug: process.env.NEXTAUTH_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  events: {
    async signIn(message) {
      console.log('[next-auth][event][signIn]', {
        provider: message?.account?.provider,
        user: !!message?.user,
      })
    },
    async signOut(message) {
      console.log('[next-auth][event][signOut]', { user: !!message?.session?.user })
    },
    async createUser(message) {
      console.log('[next-auth][event][createUser]', { id: message?.user?.id })
    },
    async linkAccount(message) {
      console.log('[next-auth][event][linkAccount]', { provider: message?.account?.provider })
    },
    async session(message) {
      console.log('[next-auth][event][session]', { user: !!message?.session?.user })
    },
  },
});

export { handler as GET, handler as POST };
