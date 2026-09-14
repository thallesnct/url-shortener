export type ShortenInput = { url: string; expiresAt: Date | null };

type ParseResult = { ok: true; value: ShortenInput } | { ok: false; error: string };

const MAX_URL_LENGTH = 2048;
// Date, time and an explicit offset; `new Date` alone also accepts "12/25/2030" and treats
// offset-less timestamps as server-local time.
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const fail = (error: string): ParseResult => ({ ok: false, error });

export function parseShortenBody(body: unknown): ParseResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return fail('Body must be a JSON object');
  }
  const { url, expiresAt } = body as Record<string, unknown>;

  if (typeof url !== 'string') return fail('"url" must be a string');
  if (url.length > MAX_URL_LENGTH)
    return fail(`"url" must be at most ${MAX_URL_LENGTH} characters`);
  const href = parseHttpUrl(url);
  if (href === null) return fail('"url" must be an absolute http(s) URL');

  if (expiresAt === undefined || expiresAt === null) {
    return { ok: true, value: { url: href, expiresAt: null } };
  }
  if (typeof expiresAt !== 'string' || !ISO_DATETIME.test(expiresAt)) {
    return fail('"expiresAt" must be an ISO-8601 datetime with a timezone offset');
  }
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return fail('"expiresAt" is not a valid datetime');
  if (date.getTime() <= Date.now()) return fail('"expiresAt" must be in the future');

  return { ok: true, value: { url: href, expiresAt: date } };
}

// The normalised href (not the raw input) is what gets stored and later sent as `Location`;
// the WHATWG parser strips tabs/newlines that would otherwise make an invalid header.
function parseHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}
