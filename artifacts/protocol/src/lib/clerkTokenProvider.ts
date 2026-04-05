let _getToken: (() => Promise<string | null>) | null = null;

export function setClerkTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

export function clearClerkTokenProvider(): void {
  _getToken = null;
}

export async function getClerkBearerToken(): Promise<string | null> {
  if (!_getToken) return null;
  try {
    return await _getToken();
  } catch {
    return null;
  }
}
