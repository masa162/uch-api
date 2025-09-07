// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LineProvider from 'next-auth/providers/line'; // LINEプロバイダーをインポート
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    // LINEプロバイダーを追加
    LineProvider({
      clientId: process.env.LINE_CHANNEL_ID ?? '',
      clientSecret: process.env.LINE_CHANNEL_SECRET ?? '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
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
    async redirect({ url }) {
      // 常にフロントエンドのドメインを基準とする
      const redirectUrl = "https://uchinokiroku.com";

      // 渡されたURLが相対パス（例: "/dashboard"）の場合、フロントエンドドメインに結合
      if (url.startsWith("/")) {
        return `${redirectUrl}${url}`;
      }
      // 渡されたURLが既にフロントエンドのドメインを含む場合、それを許可
      if (new URL(url).origin === redirectUrl) {
        return url;
      }

      // 上記以外の場合は、安全のためにフロントエンドのトップに戻す
      return redirectUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };