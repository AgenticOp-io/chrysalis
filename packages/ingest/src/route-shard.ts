/**
 * Deterministic shard assignment for manifest route rows (V2-M2).
 * Same FNV-1a 32-bit mix as `traceDeterminismSeed` in `@chrysalis/verify` so
 * corpus replay sharding and ingest route sharding stay aligned when keyed by
 * the same string (e.g. relative file path).
 */
export function routeFileShardBucket(relativePath: string, shardCount: number): number {
  const k = Math.floor(shardCount);
  if (!Number.isFinite(k) || k < 2) {
    throw new Error(`routeFileShardBucket: shardCount must be a finite integer >= 2 (got ${shardCount})`);
  }
  let h = 2166136261;
  for (let i = 0; i < relativePath.length; i++) {
    h ^= relativePath.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % k;
}

export function filterRoutesForShard<T extends { readonly file: string }>(
  routes: readonly T[],
  shardIndex: number,
  shardCount: number,
): T[] {
  const k = Math.floor(shardCount);
  const idx = Math.floor(shardIndex);
  if (!Number.isFinite(k) || k < 2) {
    throw new Error(`filterRoutesForShard: shardCount must be a finite integer >= 2 (got ${shardCount})`);
  }
  if (!Number.isFinite(idx) || idx < 0 || idx >= k) {
    throw new Error(
      `filterRoutesForShard: shardIndex must satisfy 0 <= shardIndex < shardCount (shardIndex=${shardIndex}, shardCount=${k})`,
    );
  }
  return routes.filter((r) => routeFileShardBucket(r.file, k) === idx);
}
