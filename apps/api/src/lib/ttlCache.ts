/**
 * Tiny per-instance TTL cache with in-flight de-duplication: concurrent callers for the
 * same key share one upstream call. Failures are not cached. Bounded by `maxEntries`
 * (oldest insertion evicted first).
 */
export function createTtlCache<T>(ttlMs: number, maxEntries = 500) {
  const values = new Map<string, { value: T; expires: number }>();
  const inflight = new Map<string, Promise<T>>();

  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = values.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;
      const pending = inflight.get(key);
      if (pending) return pending;

      const p = load()
        .then((value) => {
          values.delete(key);
          values.set(key, { value, expires: Date.now() + ttlMs });
          while (values.size > maxEntries) values.delete(values.keys().next().value as string);
          return value;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
      return p;
    },
    clear() {
      values.clear();
    },
  };
}
