import { randomBytes } from "crypto";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Provider config ────────────────────────────────────────────────────────────

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID ?? "";
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET ?? "";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:80";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_URL = "https://api.prod.whoop.com/developer/v1";

const REDIRECT_URI = `${APP_BASE_URL}/api/wearable/callback`;

// ── OAuth CSRF state nonce store (in-memory, expires after 10 min) ─────────────

interface PendingState {
  nonce: string;
  expiresAt: number;
}

let pendingOAuthState: PendingState | null = null;

function generateOAuthState(): string {
  const nonce = randomBytes(24).toString("hex");
  pendingOAuthState = { nonce, expiresAt: Date.now() + 10 * 60 * 1000 };
  return nonce;
}

function validateOAuthState(state: string | undefined): boolean {
  if (!pendingOAuthState) return false;
  if (Date.now() > pendingOAuthState.expiresAt) {
    pendingOAuthState = null;
    return false;
  }
  const valid = state === pendingOAuthState.nonce;
  pendingOAuthState = null;
  return valid;
}

// ── In-memory token store (single-user, Stage 3 only) ─────────────────────────

interface TokenStore {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  provider: string;
  connectedAt: string;
}

let tokenStore: TokenStore | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  if (!tokenStore) return false;
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenStore.refreshToken,
      client_id: WHOOP_CLIENT_ID,
      client_secret: WHOOP_CLIENT_SECRET,
    });
    const res = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    tokenStore = {
      ...tokenStore,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return true;
  } catch {
    return false;
  }
}

async function getValidToken(): Promise<string | null> {
  if (!tokenStore) return null;
  if (Date.now() >= tokenStore.expiresAt - 60_000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
  }
  return tokenStore.accessToken;
}

// ── Demo data generator ────────────────────────────────────────────────────────

function generateDemoData(metric: string, days: number): Array<{ date: string; value: number }> {
  const results: Array<{ date: string; value: number }> = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    let base: number;
    let noise: number;
    let range: number;

    switch (metric) {
      case "hrv":
        base = 52;
        range = 20;
        noise = 8;
        break;
      case "recovery":
        base = 65;
        range = 30;
        noise = 10;
        break;
      case "rhr":
        base = 58;
        range = 8;
        noise = 3;
        break;
      case "sleep":
        base = 7.2;
        range = 2;
        noise = 0.6;
        break;
      default:
        base = 50;
        range = 20;
        noise = 5;
    }

    const trend = Math.sin((i / days) * Math.PI * 2) * (range / 2);
    const rand = (Math.random() - 0.5) * noise * 2;
    let value = base + trend + rand;

    if (metric === "rhr") {
      value = Math.max(45, Math.min(85, value));
    } else if (metric === "sleep") {
      value = Math.max(4, Math.min(10, value));
      value = Math.round(value * 10) / 10;
    } else {
      value = Math.max(0, Math.min(100, value));
      value = Math.round(value);
    }

    results.push({ date: dateStr, value });
  }
  return results;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/wearable/connect — Start OAuth flow
router.get("/wearable/connect", (_req, res) => {
  if (!WHOOP_CLIENT_ID) {
    logger.warn("WHOOP_CLIENT_ID not configured");
    res.redirect(
      `${APP_BASE_URL}/?wearable_error=not_configured#settings`
    );
    return;
  }

  const state = generateOAuthState();

  const params = new URLSearchParams({
    client_id: WHOOP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "read:recovery read:sleep read:profile read:heart_rate",
    state,
  });

  res.redirect(`${WHOOP_AUTH_URL}?${params.toString()}`);
});

// GET /api/wearable/callback — OAuth callback
router.get("/wearable/callback", async (req, res) => {
  const { code, error, state } = req.query as Record<string, string | undefined>;

  if (error || !code) {
    logger.warn({ error }, "Wearable OAuth callback error");
    res.redirect(`${APP_BASE_URL}/?wearable_error=${encodeURIComponent(error ?? "cancelled")}#settings`);
    return;
  }

  if (!validateOAuthState(state)) {
    logger.warn({ state }, "OAuth state mismatch — possible CSRF");
    res.redirect(`${APP_BASE_URL}/?wearable_error=state_mismatch#settings`);
    return;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: WHOOP_CLIENT_ID,
      client_secret: WHOOP_CLIENT_SECRET,
    });

    const tokenRes = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.error({ status: tokenRes.status, errText }, "Token exchange failed");
      res.redirect(`${APP_BASE_URL}/?wearable_error=token_failed#settings`);
      return;
    }

    const data = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    tokenStore = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      provider: "whoop",
      connectedAt: new Date().toISOString(),
    };

    logger.info("Wearable connected: whoop");
    res.redirect(`${APP_BASE_URL}/?wearable_connected=true#settings`);
  } catch (err) {
    logger.error({ err }, "OAuth callback exception");
    res.redirect(`${APP_BASE_URL}/?wearable_error=exception#settings`);
  }
});

// GET /api/wearable/status — Check connection
router.get("/wearable/status", (_req, res) => {
  if (!tokenStore) {
    res.json({ connected: false, provider: null, connectedAt: null });
    return;
  }
  res.json({
    connected: true,
    provider: tokenStore.provider,
    connectedAt: tokenStore.connectedAt,
  });
});

// POST /api/wearable/disconnect — Clear tokens
router.post("/wearable/disconnect", (_req, res) => {
  tokenStore = null;
  logger.info("Wearable disconnected");
  res.json({ connected: false, provider: null, connectedAt: null });
});

// GET /api/wearable/data — Fetch biometric data
router.get("/wearable/data", async (req, res) => {
  const metric = (req.query.metric as string) ?? "hrv";
  const days = Math.min(90, Math.max(7, parseInt((req.query.days as string) ?? "30", 10)));

  const token = await getValidToken();

  if (!token) {
    const demoData = generateDemoData(metric, days);
    res.json({
      metric,
      data: demoData.map((d) => ({ ...d, metric })),
      source: "demo",
    });
    return;
  }

  try {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);
    const startStr = startTime.toISOString();
    const endStr = new Date().toISOString();

    let url: string;
    switch (metric) {
      case "recovery":
        url = `${WHOOP_API_URL}/recovery?start=${startStr}&end=${endStr}&limit=25`;
        break;
      case "sleep":
        url = `${WHOOP_API_URL}/activity/sleep?start=${startStr}&end=${endStr}&limit=25`;
        break;
      case "rhr":
      case "hrv":
        url = `${WHOOP_API_URL}/cycle?start=${startStr}&end=${endStr}&limit=25`;
        break;
      default:
        url = `${WHOOP_API_URL}/cycle?start=${startStr}&end=${endStr}&limit=25`;
    }

    const apiRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!apiRes.ok) {
      logger.error({ status: apiRes.status, metric }, "Whoop API error");
      throw new Error("Whoop API error");
    }

    const apiData = (await apiRes.json()) as { records: unknown[] };
    const records = apiData.records ?? [];

    const dataPoints = records.map((r: unknown) => {
      const rec = r as Record<string, unknown>;
      let value: number | null = null;
      let date = "";

      if (metric === "recovery") {
        const scoreData = rec.score as Record<string, unknown>;
        date = (rec.created_at as string)?.split("T")[0] ?? "";
        value = typeof scoreData?.recovery_score === "number" ? scoreData.recovery_score : null;
      } else if (metric === "sleep") {
        const scoreData = rec.score as Record<string, unknown>;
        date = (rec.end_time as string)?.split("T")[0] ?? "";
        const durationMs = typeof scoreData?.total_in_bed_time_milli === "number"
          ? scoreData.total_in_bed_time_milli as number : null;
        value = durationMs ? Math.round((durationMs / 3600000) * 10) / 10 : null;
      } else if (metric === "hrv") {
        const scoreData = rec.score as Record<string, unknown>;
        date = (rec.end_time as string)?.split("T")[0] ?? "";
        value = typeof scoreData?.hrv_rmssd_milli === "number" ? scoreData.hrv_rmssd_milli as number : null;
      } else if (metric === "rhr") {
        const scoreData = rec.score as Record<string, unknown>;
        date = (rec.end_time as string)?.split("T")[0] ?? "";
        value = typeof scoreData?.resting_heart_rate === "number" ? scoreData.resting_heart_rate as number : null;
      }

      return { date, value, metric };
    }).filter((d) => d.date);

    res.json({ metric, data: dataPoints, source: "whoop" });
  } catch (err) {
    logger.error({ err }, "Wearable data fetch failed, falling back to demo");
    const demoData = generateDemoData(metric, days);
    res.json({
      metric,
      data: demoData.map((d) => ({ ...d, metric })),
      source: "demo",
    });
  }
});

export default router;
