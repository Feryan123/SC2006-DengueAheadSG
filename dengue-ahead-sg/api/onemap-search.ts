/**
 * #55 - OneMap address search
 * - Receive an address or postal code and search OneMap.
 * - Get a token, reuse it and renew it when needed.
 * - Return address results or a safe error message.
 * - Keep the login and token private on the server.
 * - Supports GeocodingMapServiceBoundary for location risk and subzone lookup.
 */

const TOKEN_URL = 'https://www.onemap.gov.sg/api/auth/post/getToken';
const SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
const RENEW_EARLY_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const RESPONSE_HEADERS = { 'Cache-Control': 'no-store' };
const ADDRESS_FIELDS = [
  'SEARCHVAL', 'BLK_NO', 'ROAD_NAME', 'BUILDING', 'ADDRESS',
  'POSTAL', 'X', 'Y', 'LATITUDE', 'LONGITUDE',
] as const;

// A server restart clears this token.
let cachedToken = '';
let tokenExpiresAt = 0;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - RENEW_EARLY_MS) {
    return cachedToken;
  }

  cachedToken = '';
  tokenExpiresAt = 0;
  const email = process.env.ONEMAP_EMAIL?.trim();
  const password = process.env.ONEMAP_PASSWORD;
  if (!email || !password) {
    throw new Error('OneMap is not configured.');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error('OneMap authentication failed.');
  }

  const data: unknown = await response.json();
  if (!isObject(data) || typeof data.access_token !== 'string' || !data.access_token.trim()) {
    throw new Error('OneMap returned an invalid token.');
  }
  if (typeof data.expiry_timestamp !== 'string' && typeof data.expiry_timestamp !== 'number') {
    throw new Error('OneMap returned an invalid expiry.');
  }

  // OneMap uses seconds; Date.now() uses milliseconds.
  const expiresAt = Number(data.expiry_timestamp) * 1000;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + RENEW_EARLY_MS) {
    throw new Error('OneMap returned an unusable expiry.');
  }

  cachedToken = data.access_token.trim();
  tokenExpiresAt = expiresAt;
  return cachedToken;
}

function isTokenError(data: unknown): boolean {
  if (!isObject(data) || typeof data.error !== 'string') return false;
  const error = data.error.toLowerCase();
  return error.includes('token') && (
    error.includes('expired') || error.includes('invalid') ||
    error.includes('missing') || error.includes('required') ||
    error.includes('not provided')
  );
}

function readSearchResults(data: unknown) {
  if (!isObject(data) || data.error || !Array.isArray(data.results)) {
    throw new Error('OneMap returned invalid search data.');
  }

  const { found, totalNumPages, pageNum } = data;
  for (const value of [found, totalNumPages, pageNum]) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new Error('OneMap returned invalid search counts.');
    }
  }

  const results: Record<string, string>[] = [];
  for (const result of data.results) {
    if (!isObject(result) || typeof result.ADDRESS !== 'string' ||
        typeof result.LATITUDE !== 'string' || typeof result.LONGITUDE !== 'string') {
      throw new Error('OneMap returned an invalid address.');
    }

    // Send back address details only.
    const address: Record<string, string> = {};
    for (const field of ADDRESS_FIELDS) {
      if (typeof result[field] === 'string') address[field] = result[field];
    }
    results.push(address);
  }

  return { found, totalNumPages, pageNum, results };
}

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Only GET requests are supported.' }, {
      status: 405,
      headers: { ...RESPONSE_HEADERS, Allow: 'GET' },
    });
  }

  const searchVal = new URL(request.url).searchParams.get('searchVal')?.trim();
  if (!searchVal) {
    return Response.json({ error: 'Enter an address or postal code.' }, {
      status: 400, headers: RESPONSE_HEADERS,
    });
  }

  const searchUrl = new URL(SEARCH_URL);
  searchUrl.searchParams.set('searchVal', searchVal);
  searchUrl.searchParams.set('returnGeom', 'Y');
  searchUrl.searchParams.set('getAddrDetails', 'Y');
  searchUrl.searchParams.set('pageNum', '1');

  try {
    let token = await getToken();
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(searchUrl.toString(), {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // A 401 response may not contain JSON.
      let data: unknown = null;
      if (response.status !== 401) {
        if (!response.ok) break;
        data = await response.json();
      }

      // OneMap sometimes sends token errors with status 200.
      if (response.status === 401 || isTokenError(data)) {
        cachedToken = '';
        tokenExpiresAt = 0;
        if (attempt === 0) {
          token = await getToken();
          continue;
        }
        break;
      }

      return Response.json(readSearchResults(data), { headers: RESPONSE_HEADERS });
    }
  } catch {
    // Keep private error details off the website and out of logs.
  }

  return Response.json({ error: 'Location search is unavailable. Please try again.' }, {
    status: 503, headers: RESPONSE_HEADERS,
  });
}
