type Bucket = { startedAt: number; count: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;

function requestKey(request: Request, scope: string) {
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${scope}:${address}`;
}

/** Best-effort isolate guard. Configure Cloudflare rate limiting for global enforcement. */
export function isRateLimited(request: Request, scope: string, limit: number) {
  const now = Date.now();
  const key = requestKey(request, scope);
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
