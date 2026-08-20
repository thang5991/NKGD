export const STORES = {
  trades: 'trades',
  blog: 'blog',
  images: 'images',
  customPairs: 'customPairs',
  settings: 'settings',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

const API_BASE = '/api/data';

export async function dbGet<T>(storeName: StoreName, key: string | number): Promise<T | undefined> {
  try {
    const res = await fetch(`${API_BASE}/${storeName}/${encodeURIComponent(String(key))}`);
    if (!res.ok) {
      if (res.status === 404) return undefined;
      throw new Error(`API error: ${res.statusText}`);
    }
    const data = await res.json();
    return data as T;
  } catch (err) {
    console.error(`Error in dbGet(${storeName}, ${key}):`, err);
    return undefined;
  }
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}/${storeName}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    const data = await res.json();
    return (Array.isArray(data) ? data : []) as T[];
  } catch (err) {
    console.error(`Error in dbGetAll(${storeName}):`, err);
    throw err;
  }
}

export async function dbPut<T>(storeName: StoreName, value: T): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${storeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
  } catch (err) {
    console.error(`Error in dbPut(${storeName}):`, err);
    throw err;
  }
}

export async function dbDelete(storeName: StoreName, key: string | number): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${storeName}/${encodeURIComponent(String(key))}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
  } catch (err) {
    console.error(`Error in dbDelete(${storeName}, ${key}):`, err);
    throw err;
  }
}

export async function dbClear(storeName: StoreName): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${storeName}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
  } catch (err) {
    console.error(`Error in dbClear(${storeName}):`, err);
    throw err;
  }
}

export async function dbGetByIndex<T>(
  storeName: StoreName,
  indexName: string,
  key: string | number
): Promise<T[]> {
  try {
    const all = await dbGetAll<T>(storeName);
    return all.filter((item: any) => String(item[indexName]) === String(key));
  } catch (err) {
    console.error(`Error in dbGetByIndex(${storeName}, ${indexName}, ${key}):`, err);
    return [];
  }
}
