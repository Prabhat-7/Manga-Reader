import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString,
    });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
