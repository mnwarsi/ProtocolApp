import { getStripeSync } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(`Webhook payload must be a raw Buffer, got ${typeof payload}`);
    }

    const sync = await getStripeSync();
    if (!sync) {
      throw new Error("Stripe not configured");
    }

    await sync.processWebhook(payload, signature);
  }
}
