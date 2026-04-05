import { Router, type IRouter } from "express";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAX_BLOB_SIZE = 2 * 1024 * 1024;

// GET /api/sync/salt — Get (or create) per-user encryption salt
router.get("/sync/salt", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  try {
    await storage.upsertUser({ id: userId });
    const salt = await storage.getOrCreateEncryptionSalt(userId);
    res.json({ salt });
  } catch (err) {
    logger.error({ err }, "Failed to get encryption salt");
    res.status(500).json({ error: "Failed to get encryption salt" });
  }
});

// GET /api/sync/blob — Download encrypted payload (Pro only)
router.get("/sync/blob", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  try {
    await storage.upsertUser({ id: userId });
    const tier = await storage.getUserTier(userId);
    if (tier !== "pro") {
      res.status(403).json({ error: "Cloud sync requires Protocol Pro" });
      return;
    }

    const blobRecord = await storage.getCloudBlob(userId);
    if (!blobRecord) {
      res.status(404).json({ blob: null });
      return;
    }
    res.json({ blob: blobRecord.blob, updatedAt: blobRecord.updatedAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to get cloud blob");
    res.status(500).json({ error: "Failed to get sync data" });
  }
});

// PUT /api/sync/blob — Upload encrypted payload (Pro only)
router.put("/sync/blob", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { blob } = req.body as { blob?: string };

  if (!blob || typeof blob !== "string") {
    res.status(400).json({ error: "blob is required" });
    return;
  }

  if (blob.length > MAX_BLOB_SIZE) {
    res.status(413).json({ error: "Payload too large" });
    return;
  }

  try {
    await storage.upsertUser({ id: userId });
    const tier = await storage.getUserTier(userId);
    if (tier !== "pro") {
      res.status(403).json({ error: "Cloud sync requires Protocol Pro" });
      return;
    }

    await storage.putCloudBlob(userId, blob);
    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to put cloud blob");
    res.status(500).json({ error: "Failed to save sync data" });
  }
});

export default router;
