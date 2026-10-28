/**
 * #27 - Tests for the snapshot function used by SnapshotDataService
 * - Use fake GitHub replies; no real token is needed.
 * - Check the snapshot is returned compact, cached and served stale when GitHub fails.
 * - Check that the token and upstream errors are never returned.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = Date.UTC(2026, 9, 28);
const TOKEN = 'fake-github-token-for-tests';
const SNAPSHOT = {
  generatedAt: '2026-10-28T07:42:38.427Z',
  datasets: {},
  subzones: [{ subzoneId: 'AMSZ04', name: 'TOWNSVILLE' }],
};
const UNAVAILABLE = { error: 'Public data is unavailable. Please try again later.' };
const fetchMock = vi.fn<typeof fetch>();
let handleSnapshot: typeof import('../api/snapshot.ts').GET;

function request(method = 'GET') {
  return new Request('http://localhost/api/snapshot', { method });
}

function githubReply(body: unknown = SNAPSHOT) {
  // GitHub returns the committed file pretty-printed.
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

beforeEach(async () => {
  // Start each test with an empty server copy.
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SNAPSHOT_GITHUB_TOKEN', TOKEN);
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  handleSnapshot = (await import('../api/snapshot.ts')).GET;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GET /api/snapshot', () => {
  it('returns the data-branch snapshot as compact JSON with CDN caching', async () => {
    fetchMock.mockResolvedValueOnce(githubReply());

    const response = await handleSnapshot(request());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toBe(JSON.stringify(SNAPSHOT));
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=600');
  });

  it('reads the data branch through the GitHub API with the server token', async () => {
    fetchMock.mockResolvedValueOnce(githubReply());

    await handleSnapshot(request());
    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(String(url)).toContain('/contents/dengue-ahead-sg/data/derived/latest-snapshot.json?ref=data');
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers.Accept).toBe('application/vnd.github.raw+json');
  });

  it('reuses its copy for 10 minutes, then fetches again', async () => {
    fetchMock.mockResolvedValue(githubReply());

    await handleSnapshot(request());
    vi.mocked(Date.now).mockReturnValue(NOW + 9 * 60_000);
    await handleSnapshot(request());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.mocked(Date.now).mockReturnValue(NOW + 10 * 60_000);
    await handleSnapshot(request());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves the last good copy when GitHub fails later', async () => {
    fetchMock.mockResolvedValueOnce(githubReply());
    await handleSnapshot(request());

    vi.mocked(Date.now).mockReturnValue(NOW + 60 * 60_000);
    fetchMock.mockResolvedValueOnce(new Response('Server error', { status: 502 }));
    const response = await handleSnapshot(request());

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(JSON.stringify(SNAPSHOT));
  });

  it.each([
    ['GitHub rejects the token', () => fetchMock.mockResolvedValueOnce(new Response('Bad credentials', { status: 401 }))],
    ['the file is missing', () => fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))],
    ['the network fails', () => fetchMock.mockRejectedValueOnce(new Error(`network down for ${TOKEN}`))],
    ['the snapshot has no subzones', () => fetchMock.mockResolvedValueOnce(githubReply({ ...SNAPSHOT, subzones: [] }))],
    ['the body is not JSON', () => fetchMock.mockResolvedValueOnce(new Response('<html>'))],
  ])('returns a safe 503 with no copy when %s', async (_case, queue) => {
    queue();

    const response = await handleSnapshot(request());
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual(UNAVAILABLE);
    expect(body).not.toContain(TOKEN);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 503 without calling GitHub when the token is not configured', async () => {
    vi.stubEnv('SNAPSHOT_GITHUB_TOKEN', '');

    const response = await handleSnapshot(request());

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects methods other than GET', async () => {
    const response = await handleSnapshot(request('POST'));

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
