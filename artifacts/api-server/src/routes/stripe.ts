import { Router, type IRouter } from "express";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { storage } from "../storage";
import { isStripeConfigured, getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APP_BASE_URL = process.env.APP_BASE_URL ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost"}`;

// GET /api/subscription/status
router.get("/subscription/status", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  try {
    await storage.upsertUser({ id: userId });
    const tier = await storage.getUserTier(userId);
    res.json({ tier });
  } catch (err) {
    logger.error({ err }, "Failed to get subscription status");
    res.json({ tier: "free" });
  }
});

// POST /api/subscription/checkout — Create Stripe Checkout session
router.post("/subscription/checkout", requireAuth, async (req, res) => {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: "Payments not configured" });
    return;
  }

  const userId = (req as AuthedRequest).userId;
  const { priceId, email } = req.body as { priceId: string; email?: string };

  if (!priceId) {
    res.status(400).json({ error: "priceId is required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      res.status(503).json({ error: "Payments not configured" });
      return;
    }

    await storage.upsertUser({ id: userId, email: email ?? null });
    let user = await storage.getUser(userId);

    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      });
      await storage.updateUserStripeCustomer(userId, customer.id);
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${APP_BASE_URL}/?checkout=success#settings`,
      cancel_url: `${APP_BASE_URL}/?checkout=cancel#settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Checkout session creation failed");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /api/subscription/portal — Create customer portal session
router.post("/subscription/portal", requireAuth, async (req, res) => {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: "Payments not configured" });
    return;
  }

  const userId = (req as AuthedRequest).userId;

  try {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      res.status(503).json({ error: "Payments not configured" });
      return;
    }

    const user = await storage.getUser(userId);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No subscription found" });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${APP_BASE_URL}/#settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Portal session creation failed");
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

// GET /api/subscription/price — Get Pro price ID from Stripe catalog
router.get("/subscription/price", async (_req, res) => {
  if (!isStripeConfigured()) {
    res.json({ priceId: null, amount: 1999, currency: "usd" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      res.json({ priceId: null, amount: 1999, currency: "usd" });
      return;
    }

    const products = await stripe.products.search({
      query: "name:'Protocol Pro' AND active:'true'",
    });

    if (products.data.length === 0) {
      res.json({ priceId: null, amount: 1999, currency: "usd" });
      return;
    }

    const prices = await stripe.prices.list({
      product: products.data[0].id,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      res.json({ priceId: null, amount: 1999, currency: "usd" });
      return;
    }

    const price = prices.data[0];
    res.json({
      priceId: price.id,
      amount: price.unit_amount,
      currency: price.currency,
    });
  } catch (err) {
    logger.error({ err }, "Price lookup failed");
    res.json({ priceId: null, amount: 1999, currency: "usd" });
  }
});

export default router;
