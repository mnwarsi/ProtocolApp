import app from "./app";
import { logger } from "./lib/logger";
import { isStripeConfigured, getStripeSync } from "./stripeClient";
import { runMigrations } from "stripe-replit-sync";

async function initStripe(): Promise<void> {
  if (!isStripeConfigured()) {
    logger.info("Stripe not configured — skipping Stripe init");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL!;

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();
    if (!stripeSync) return;

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const webhookUrl = `${webhookBaseUrl}/api/stripe/webhook`;

    try {
      const result = await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      logger.info({ url: (result as unknown as Record<string, unknown> | undefined)?.['url'] ?? 'configured' }, "Stripe webhook configured");
    } catch (err) {
      logger.warn({ err }, "Stripe webhook setup failed — continuing");
    }

    stripeSync.syncBackfill().then(() => {
      logger.info("Stripe backfill complete");
    }).catch((err) => {
      logger.warn({ err }, "Stripe backfill warning");
    });
  } catch (err) {
    logger.error({ err }, "Stripe initialization failed");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
