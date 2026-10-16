export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

// A local queue: PVZ2 never imports the PVZ1 loader or its resource index.
export async function loadInBatches<T>(items: readonly T[], concurrency: number, load: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await load(items[next++]);
  }));
}

export async function json<T>(path: string): Promise<T> {
  const response = await fetch(assetUrl(path));
  return response.json();
}
