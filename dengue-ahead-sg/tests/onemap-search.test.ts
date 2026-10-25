/**
 * #55 - Tests for the OneMap search used by GeocodingMapServiceBoundary
 * - Use fake OneMap replies; no real login details are needed.
 * - Check successful searches, no matches and service failures.
 * - Check that expired tokens are renewed and retries stop.
 * - Check that private login details and tokens are not returned.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = Date.UTC(2026, 9, 26);
const TOKEN_URL = 'https://www.onemap.gov.sg/api/auth/post/getToken';
const SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
const UNAVAILABLE = { error: 'Location search is unavailable. Please try again.' };
const MATCH = {
  found: 1,
  totalNumPages: 1,
  pageNum: 1,
  results: [{
    ADDRESS: '640 ROWELL ROAD SINGAPORE 200640',
    POSTAL: '200640',
    LATITUDE: '1.30743547948389',
    LONGITUDE: '103.854713903431',
  }],
};
const NO_MATCH = { found: 0, totalNumPages: 0, pageNum: 1, results: [] };
const fetchMock = vi.fn<typeof fetch>();
let handleSearch: typeof import('../api/onemap-search.ts').GET;

function request(query?: string) {
  const url = new URL('http://localhost/api/onemap-search');
  if (query !== undefined) url.searchParams.set('searchVal', query);
  return new Request(url);
}

function tokenResponse(token = 'test-token', expiry: unknown = String(NOW / 1000 + 259200)) {
  return Response.json({ access_token: token, expiry_timestamp: expiry });
}

function queueSuccess() {
  fetchMock.mockResolvedValueOnce(tokenResponse());
  fetchMock.mockResolvedValueOnce(Response.json(MATCH));
}

beforeEach(async () => {
  // Start each test with a fresh token cache.
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('ONEMAP_EMAIL', 'test@example.invalid');
  vi.stubEnv('ONEMAP_PASSWORD', 'fake-password-for-tests');
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  handleSearch = (await import('../api/onemap-search.ts')).GET;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('OneMap search proxy (#55)', () => {
  it('returns a valid postal-code result and keeps authentication on the server', async () => {
    queueSuccess();
    const response = await handleSearch(request('200640'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual(MATCH);
    expect(fetchMock).toHaveBeenNthCalledWith(1, TOKEN_URL, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.invalid', password: 'fake-password-for-tests' }),
      signal: expect.any(AbortSignal),
    }));
    const [url, options] = fetchMock.mock.calls[1];
    const searchUrl = new URL(String(url));
    expect(searchUrl.origin + searchUrl.pathname).toBe(SEARCH_URL);
    expect(Object.fromEntries(searchUrl.searchParams)).toEqual({
      searchVal: '200640', returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1',
    });
    expect(options).toEqual({
      headers: { Authorization: 'test-token' },
      signal: expect.any(AbortSignal),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('encodes address text and ignores client-supplied upstream settings', async () => {
    queueSuccess();
    const url = new URL(request('  North Buona Vista Drive & Road  ').url);
    url.searchParams.set('pageNum', '999');
    url.searchParams.set('url', 'https://unrelated.example');
    const response = await handleSearch(new Request(url, {
      headers: { Authorization: 'client-token' },
    }));

    expect(response.status).toBe(200);
    const upstreamUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(upstreamUrl.searchParams.get('searchVal')).toBe('North Buona Vista Drive & Road');
    expect(upstreamUrl.searchParams.get('pageNum')).toBe('1');
    expect(upstreamUrl.searchParams.has('url')).toBe(false);
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ Authorization: 'test-token' });
  });

  it('returns no match for an invalid postal code without calling it an outage', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockResolvedValueOnce(Response.json(NO_MATCH));
    const response = await handleSearch(request('000000'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(NO_MATCH);
  });

  it.each([undefined, '', '   '])('rejects empty search input: %s', async (query) => {
    const response = await handleSearch(request(query));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Enter an address or postal code.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported HTTP methods', async () => {
    const response = await handleSearch(new Request(request('200640'), { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['ONEMAP_EMAIL', 'ONEMAP_PASSWORD'])('handles missing configuration: %s', async (name) => {
    vi.stubEnv(name, '');
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reuses a valid cached token for the next search', async () => {
    queueSuccess();
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    await handleSearch(request('200640'));
    const response = await handleSearch(request('Rowell Road'));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => url === TOKEN_URL)).toHaveLength(1);
    expect(fetchMock.mock.calls[2][1]?.headers).toEqual({ Authorization: 'test-token' });
  });

  it.each([1000, 62000])('renews at the early-renewal boundary or after expiry (%i ms)', async (elapsed) => {
    fetchMock.mockResolvedValueOnce(tokenResponse('first-token', (NOW + 61000) / 1000));
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    await handleSearch(request('200640'));

    vi.mocked(Date.now).mockReturnValue(NOW + elapsed);
    fetchMock.mockResolvedValueOnce(tokenResponse('renewed-token'));
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    const response = await handleSearch(request('200640'));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1]?.headers).toEqual({ Authorization: 'renewed-token' });
  });

  it('accepts a numeric expiry timestamp as well as a string', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('test-token', NOW / 1000 + 259200));
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    expect((await handleSearch(request('200640'))).status).toBe(200);
  });

  it.each([null, 'not-a-timestamp', NOW / 1000 - 1, NOW / 1000 + 60])(
    'does not search using an unusable expiry: %s', async (expiry) => {
      fetchMock.mockResolvedValueOnce(tokenResponse('test-token', expiry));
      const response = await handleSearch(request('200640'));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual(UNAVAILABLE);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects an empty authentication token', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('   '));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renews once after HTTP 401, even when its body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('first-token'));
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    fetchMock.mockResolvedValueOnce(tokenResponse('renewed-token'));
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    const response = await handleSearch(request('200640'));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1]?.headers).toEqual({ Authorization: 'renewed-token' });
  });

  it.each([
    'Authentication token expired. Tokens is valid for 3 days.',
    'Invalid authentication token.',
    'Authentication token missing. Please provide a valid token.',
  ])('renews once after an HTTP 200 token error: %s', async (error) => {
    fetchMock.mockResolvedValueOnce(tokenResponse('first-token'));
    fetchMock.mockResolvedValueOnce(Response.json({ ...NO_MATCH, error }));
    fetchMock.mockResolvedValueOnce(tokenResponse('renewed-token'));
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    const response = await handleSearch(request('200640'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(MATCH);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each([401, 200])('stops if the renewed token is also rejected (HTTP %i)', async (status) => {
    const rejected = () => Response.json({ error: 'Authentication token expired.' }, { status });
    fetchMock.mockResolvedValueOnce(tokenResponse('first-token'));
    fetchMock.mockResolvedValueOnce(rejected());
    fetchMock.mockResolvedValueOnce(tokenResponse('renewed-token'));
    fetchMock.mockResolvedValueOnce(rejected());
    const response = await handleSearch(request('200640'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Do not reuse a token that OneMap rejected.
    fetchMock.mockResolvedValueOnce(tokenResponse('next-request-token'));
    fetchMock.mockResolvedValueOnce(Response.json(MATCH));
    expect((await handleSearch(request('200640'))).status).toBe(200);
    expect(fetchMock.mock.calls[4][0]).toBe(TOKEN_URL);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('does not renew for unrelated service errors or expose their details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Private upstream error details' }));
    const response = await handleSearch(request('200640'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(log).not.toHaveBeenCalled();
  });

  it('handles rejected login credentials without returning the authentication response', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Private login details' }, { status: 401 }));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles malformed authentication JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not JSON'));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
  });

  it('handles search HTTP failures without unnecessary login retries', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockResolvedValueOnce(new Response('Service down', { status: 500 }));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('handles malformed search JSON', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockResolvedValueOnce(new Response('not JSON'));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
  });

  it.each(['network failure', 'request timeout'])('handles %s without leaking errors', async (failure) => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockRejectedValueOnce(new Error(failure + ': private details'));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
  });

  it.each([
    null,
    { ...MATCH, results: null },
    { ...MATCH, found: -1 },
    { ...MATCH, results: [{ ADDRESS: 'Missing coordinates' }] },
  ])('handles malformed search data: %j', async (data) => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockResolvedValueOnce(Response.json(data));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(UNAVAILABLE);
  });

  it('returns only search fields, even if upstream includes authentication or extra fields', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    fetchMock.mockResolvedValueOnce(Response.json({
      ...MATCH,
      access_token: 'must-not-be-returned',
      expiry_timestamp: '1234567890',
      email: 'must-not-be-returned',
      results: [{ ...MATCH.results[0], password: 'must-not-be-returned', access_token: 'hidden' }],
    }));
    const response = await handleSearch(request('200640'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(MATCH);
  });
});
