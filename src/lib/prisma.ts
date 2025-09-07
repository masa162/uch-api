// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // 詳細なログを出力
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;