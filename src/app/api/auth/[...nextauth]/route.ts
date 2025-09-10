// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth';
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

const providers = [];

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

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// DBを使わない開発モードを許可（JWTのみ）
// AUTH_USE_DB=false または DATABASE_URL 未設定時はアダプターを無効化
const useDb = (process.env.AUTH_USE_DB ?? 'true').toLowerCase() !== 'false' && !!process.env.DATABASE_URL

const handler = NextAuth({
  ...(useDb ? { adapter: PrismaAdapter(prisma) } : {}),
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    // サインインUIはフロントエンドの /signin を利用
    signIn: `${FRONTEND_URL}/signin`,
    // エラーもフロントのサインインに集約して表示（error クエリで受け取る）
    error: `${FRONTEND_URL}/signin`,
  },
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
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
