/**
 * Database Client & Query Helpers
 *
 * ⚠️  IMPORTANT: DO NOT REMOVE the `db` export below!
 *     It's required by server/_core/auth.ts for Better Auth to work.
 *
 * You can safely add your own query helper functions at the bottom of this file.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

// =============================================================================
// DATABASE CLIENT - DO NOT MODIFY THIS SECTION
// =============================================================================

// Create drizzle instance synchronously - required for Better Auth adapter
// If DATABASE_URL is not set, db will be null and operations will gracefully fail
const client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : null;
export const db = client ? drizzle(client, { schema }) : null;

// Sync getter for backwards compatibility
export function getDb() {
  return db;
}

// Re-export schema types for convenience
export * from "../drizzle/schema";

// =============================================================================
// YOUR QUERY HELPERS - Add your database queries below
// =============================================================================

// Example query helper:
// import { eq } from "drizzle-orm";
//
// export async function getUserById(userId: string) {
//   if (!db) return null;
//   const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
//   return user ?? null;
// }
//
// export async function createUser(data: { name: string; email: string }) {
//   if (!db) throw new Error("Database not available");
//   const [user] = await db.insert(schema.users).values(data).returning();
//   return user;
// }
