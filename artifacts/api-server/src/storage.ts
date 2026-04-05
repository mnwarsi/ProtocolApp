import { eq, sql } from "drizzle-orm";
import { db, users, cloudBlobs } from "@workspace/db";
import type { InsertUser } from "@workspace/db";

export class Storage {
  async upsertUser(user: InsertUser) {
    const [result] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: sql`EXCLUDED.email`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();
    return result;
  }

  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async updateUserStripeCustomer(userId: string, stripeCustomerId: string) {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: sql`NOW()` })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserTier(userId: string): Promise<"free" | "pro"> {
    try {
      const user = await this.getUser(userId);
      if (!user?.stripeCustomerId) return "free";

      const result = await db.execute(sql`
        SELECT s.status FROM stripe.subscriptions s
        WHERE s.customer = ${user.stripeCustomerId}
          AND s.status IN ('active', 'trialing')
        ORDER BY s.created DESC
        LIMIT 1
      `);

      if (result.rows.length > 0) return "pro";
      return "free";
    } catch {
      return "free";
    }
  }

  async getCloudBlob(userId: string): Promise<string | null> {
    const [row] = await db
      .select()
      .from(cloudBlobs)
      .where(eq(cloudBlobs.userId, userId));
    return row?.blob ?? null;
  }

  async putCloudBlob(userId: string, blob: string): Promise<void> {
    await db
      .insert(cloudBlobs)
      .values({ userId, blob })
      .onConflictDoUpdate({
        target: cloudBlobs.userId,
        set: { blob, updatedAt: sql`NOW()` },
      });
  }
}

export const storage = new Storage();
