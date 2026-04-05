import { Router, type IRouter } from "express";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAX_BLOB_SIZE = 2 * 1024 * 1024;

// GET /api/sync/blob — Download encrypted payload for authenticated user
router.get("/sync/blob", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  try {
    await storage.upsertUser({ id: userId });
    const blob = await storage.getCloudBlob(userId);
    if (!blob) {
      res.status(404).json({ blob: null });
      return;
    }
    res.json({ blob });
  } catch (err) {
    logger.error({ err }, "Failed to get cloud blob");
    res.status(500).json({ error: "Failed to get sync data" });
  }
});

// PUT /api/sync/blob — Upload encrypted payload for authenticated user
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
    await storage.putCloudBlob(userId, blob);
    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to put cloud blob");
    res.status(500).json({ error: "Failed to save sync data" });
  }
});

export default router;
