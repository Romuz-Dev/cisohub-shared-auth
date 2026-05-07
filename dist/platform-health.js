import crypto from "crypto";
import { sql, eq, max, count } from "drizzle-orm";
const HEADER = "x-platform-admin-key";
function safeEqual(a, b) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length)
        return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}
export function registerPlatformHealthRoute(app, healthCheck) {
    if (!healthCheck) {
        throw new Error("[shared-auth] mountHealthRoute() requires `healthCheck` in configureAuth() config (DEC-SA-PKG-07).");
    }
    const db = healthCheck.db;
    const users = healthCheck.usersTable;
    app.get("/api/platform/health", async (req, res) => {
        const expected = process.env.PLATFORM_ADMIN_KEY;
        if (!expected || expected.length === 0) {
            return res
                .status(503)
                .json({ error: "PLATFORM_ADMIN_KEY_NOT_CONFIGURED" });
        }
        const provided = req.header(HEADER);
        if (!provided || !safeEqual(provided, expected)) {
            return res.status(401).json({ error: "UNAUTHORIZED" });
        }
        res.set("Cache-Control", "no-store");
        let dbConnected = false;
        try {
            await db.execute(sql `SELECT 1`);
            dbConnected = true;
        }
        catch {
            dbConnected = false;
        }
        let lastLoginAt = null;
        try {
            const rows = await db
                .select({ value: max(users.lastLoginAt) })
                .from(users);
            const v = rows[0]?.value;
            lastLoginAt = v ? new Date(v).toISOString() : null;
        }
        catch {
            lastLoginAt = null;
        }
        let activeUsers = 0;
        try {
            const rows = await db
                .select({ value: count() })
                .from(users)
                .where(eq(users.status, "ACTIVE"));
            activeUsers = Number(rows[0]?.value ?? 0);
        }
        catch {
            activeUsers = 0;
        }
        return res.status(200).json({
            status: dbConnected ? "UP" : "DOWN",
            dbConnected,
            lastLoginAt,
            activeUsers,
            catalogVersion: process.env.CATALOG_VERSION ?? "1.0.0",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    });
}
//# sourceMappingURL=platform-health.js.map