// Cloud sync encryption helpers
// Key is derived deterministically from user ID + server-provided per-user salt.
// The server-side salt is random and stored in the DB — this prevents a DB operator
// from deriving the encryption key from the userId alone.

const CLOUD_SYNC_FIXED_SALT = "protocol-cloud-v1";
const ITERATIONS = 100_000;

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveCloudKey(userId: string, serverSalt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Mix userId + serverSalt as the key material input
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(userId + serverSalt),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(CLOUD_SYNC_FIXED_SALT),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function apiUrl(path: string): string {
  const base = (import.meta as unknown as { env: Record<string, string> }).env.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/api${path}`;
}

// Cache the per-user salt in memory during the session to avoid extra round trips
const saltCache = new Map<string, string>();

async function fetchServerSalt(userId: string): Promise<string> {
  const cached = saltCache.get(userId);
  if (cached) return cached;

  const res = await fetch(apiUrl("/sync/salt"), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch encryption salt");
  const data = await res.json() as { salt?: string };
  if (!data.salt) throw new Error("No salt returned");
  saltCache.set(userId, data.salt);
  return data.salt;
}

export async function encryptForCloud(userId: string, payload: unknown): Promise<string> {
  const serverSalt = await fetchServerSalt(userId);
  const key = await deriveCloudKey(userId, serverSalt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);

  return bufToBase64(combined.buffer);
}

export async function decryptFromCloud<T>(userId: string, blob: string): Promise<T> {
  const serverSalt = await fetchServerSalt(userId);
  const key = await deriveCloudKey(userId, serverSalt);
  const combined = base64ToBuf(blob);

  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );

  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export async function fetchTier(signal?: AbortSignal): Promise<"free" | "pro"> {
  try {
    const res = await fetch(apiUrl("/subscription/status"), {
      credentials: "include",
      signal,
    });
    if (!res.ok) return "free";
    const data = await res.json() as { tier?: string };
    return data.tier === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

export async function uploadBlob(blob: string): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/sync/blob"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function downloadBlob(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl("/sync/blob"), {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json() as { blob?: string };
    return data.blob ?? null;
  } catch {
    return null;
  }
}
