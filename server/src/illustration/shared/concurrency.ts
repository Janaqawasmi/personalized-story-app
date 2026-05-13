/** Run async work over `items` with at most `poolSize` concurrent executions. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  poolSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) return;
      const item = items[i];
      if (item === undefined) return;
      results[i] = await fn(item, i);
    }
  }

  const n = Math.max(1, Math.min(poolSize, items.length || 1));
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return results;
}
