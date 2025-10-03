export type GeoPoint = { lat: number; lon: number };

const cache = new Map<string, GeoPoint>();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  // Be nice to the free API: brief delay to avoid rapid bursts
  await sleep(150);
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  const point = { lat: parseFloat(first.lat), lon: parseFloat(first.lon) };
  cache.set(key, point);
  return point;
}

export async function geocodeMany(addresses: string[], limit: number = 25): Promise<Record<string, GeoPoint>> {
  const result: Record<string, GeoPoint> = {};
  for (const address of addresses.slice(0, limit)) {
    const p = await geocodeAddress(address);
    if (p) result[address] = p;
  }
  return result;
}


