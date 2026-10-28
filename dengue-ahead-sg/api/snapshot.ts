/**
 * #27 - Public data snapshot for the deployed app
 * - Read the latest snapshot that the hourly sync (#12) commits to the private 'data' branch.
 * - Keep the GitHub token private on the server; the browser only sees the snapshot.
 * - Return compact JSON (the committed file is pretty-printed and too large for a function response).
 * - Serve the last good copy if GitHub is unavailable; the CDN caches responses between syncs.
 * - Supports SnapshotDataService (via CachedPublicDataServiceProxy) in the browser.
 */

const SNAPSHOT_URL =
  'https://api.github.com/repos/Feryan123/SC2006-DengueAheadSG/contents/dengue-ahead-sg/data/derived/latest-snapshot.json?ref=data';
const REUSE_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
// The sync runs hourly, so a 10-minute CDN copy is fresh enough and keeps GitHub calls low.
const SUCCESS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3000',
};
const ERROR_HEADERS = { 'Cache-Control': 'no-store' };

// A server restart clears this copy.
let cachedBody = '';
let cachedAt = 0;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fetchSnapshot(): Promise<string> {
  const token = process.env.SNAPSHOT_GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error('Snapshot source is not configured.');
  }

  const response = await fetch(SNAPSHOT_URL, {
    headers: {
      Accept: 'application/vnd.github.raw+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error('Snapshot request failed.');
  }

  // Basic shape only; the browser runs the full isPublicDataSnapshot check.
  const data: unknown = await response.json();
  if (!isObject(data) || typeof data.generatedAt !== 'string' ||
      !Array.isArray(data.subzones) || data.subzones.length === 0) {
    throw new Error('Snapshot is invalid.');
  }

  return JSON.stringify(data);
}

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Only GET requests are supported.' }, {
      status: 405,
      headers: { ...ERROR_HEADERS, Allow: 'GET' },
    });
  }

  if (!cachedBody || Date.now() - cachedAt >= REUSE_MS) {
    try {
      cachedBody = await fetchSnapshot();
      cachedAt = Date.now();
    } catch {
      // Keep private error details off the website; fall back to the last good copy below.
    }
  }

  if (cachedBody) {
    return new Response(cachedBody, { headers: SUCCESS_HEADERS });
  }

  return Response.json({ error: 'Public data is unavailable. Please try again later.' }, {
    status: 503, headers: ERROR_HEADERS,
  });
}
