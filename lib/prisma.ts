import { PrismaClient } from "@prisma/client";

/**
 * Next.js hot-reloads server modules in development, which means
 * new PrismaClient() at module scope creates a brand new database
 * connection on every file save until Postgres refuses new connections.
 *
 * Caching the instance on globalThis keeps exactly one client alive.
 */
function createPrismaClient() {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    // Neon's free-tier database auto-suspends when idle and takes a few seconds
    // to wake back up, which makes the first query after a gap fail with "Can't
    // reach database server". Retry that specific error a couple of times
    // before giving up.
    return client.$extends({
        query: {
            async $allOperations({ args, query }) {
                const maxAttempts = 5;
                for (let attempt = 1; ; attempt++) {
                    try {
                        return await query(args);
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "";
                        const isColdStart = message.includes("Can't reach database server");
                        if (!isColdStart || attempt >= maxAttempts) throw error;
                        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
                    }
                }
            },
        },
    });
}

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;