// Limit simultaneous downloads, decodes and GPU uploads without changing errors.
export async function loadInBatches<T>(items: readonly T[], concurrency: number, load: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await load(items[next++]);
  }));
}
