import { StripeSync } from "stripe-replit-sync";
import Stripe from "stripe";

let syncInstance: StripeSync | null = null;

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.DATABASE_URL);
}

export async function getStripeSync(): Promise<StripeSync | null> {
  if (!isStripeConfigured()) return null;
  if (syncInstance) return syncInstance;

  syncInstance = new StripeSync({
    poolConfig: {
      connectionString: process.env.DATABASE_URL!,
      max: 5,
    },
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  });

  return syncInstance;
}

export async function getUncachableStripeClient(): Promise<Stripe | null> {
  if (!isStripeConfigured()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-04-30.basil",
  });
}
