/**
 * Server-side authentication utilities
 * Validates Bearer token for /api/ingest endpoint
 */

export function validateBearerToken(authHeader: string | null): boolean {
  const expectedToken = process.env.INGEST_TOKEN;

  if (!expectedToken) {
    console.error('INGEST_TOKEN environment variable is not set');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === expectedToken;
}

export function createAuthError() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
