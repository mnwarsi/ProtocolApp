const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = "SHA-256";
const AES_KEY_LEN = 256;
const IV_BYTES = 12;
const SALT_BYTES = 16;

export async function generateSalt(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

export function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt));
}

export function base64ToSalt(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    raw,
    { name: "AES-GCM", length: AES_KEY_LEN },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(key: CryptoKey, data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const plain = enc.encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const combined = new Uint8Array(IV_BYTES + cipher.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher), IV_BYTES);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptPayload(key: CryptoKey, b64: string): Promise<unknown> {
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_BYTES);
  const cipher = combined.slice(IV_BYTES);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}
