import { PrismaClient } from '@prisma/client';

/**
 * Single shared Prisma client. Creating one per request would exhaust
 * the Postgres connection pool.
 */
export const prisma = new PrismaClient();
