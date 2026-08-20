import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');

// Ensure data and uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getFilePath(storeName: string): string {
  return path.join(DATA_DIR, `${storeName}.json`);
}

function readStore(storeName: string): any {
  const filePath = getFilePath(storeName);
  try {
    if (!fs.existsSync(filePath)) {
      if (storeName === 'settings') {
        const defaultSettings = { defaultRiskPercent: 1, defaultAccountBalance: 10000, theme: 'dark' };
        fs.writeFileSync(filePath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
        return defaultSettings;
      }
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || (storeName === 'settings' ? '{}' : '[]'));
  } catch (err) {
    console.error(`Error reading store ${storeName}:`, err);
    return storeName === 'settings' ? {} : [];
  }
}

function writeStore(storeName: string, data: any): boolean {
  const filePath = getFilePath(storeName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing store ${storeName}:`, err);
    return false;
  }
}

interface FxRateRecord {
  id: string;
  requestedDate: string;
  rateDate: string;
  base: string;
  quote: string;
  rate: number;
  source: 'frankfurter';
  fetchedAt: string;
}

function normalizeCurrency(value: string | null): string {
  const currency = (value || '').toUpperCase().trim();
  return currency === 'USDT' ? 'USD' : currency;
}

function previousUtcDate(date: string, daysBack: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - daysBack);
  return value.toISOString().slice(0, 10);
}

async function fetchHistoricalFxRate(base: string, quote: string, requestedDate: string): Promise<FxRateRecord> {
  const cache = readStore('fxRates');
  const records: FxRateRecord[] = Array.isArray(cache) ? cache : [];
  const id = `${requestedDate}-${base}-${quote}`;
  const cached = records.find((item) => item.id === id);
  if (cached) return cached;

  if (base === quote) {
    const identity: FxRateRecord = {
      id,
      requestedDate,
      rateDate: requestedDate,
      base,
      quote,
      rate: 1,
      source: 'frankfurter',
      fetchedAt: new Date().toISOString(),
    };
    records.push(identity);
    writeStore('fxRates', records);
    return identity;
  }

  let lastError = 'Không tìm thấy tỷ giá';
  for (let daysBack = 0; daysBack <= 7; daysBack++) {
    const candidateDate = previousUtcDate(requestedDate, daysBack);
    const endpoint = new URL(`https://api.frankfurter.dev/v1/${candidateDate}`);
    endpoint.searchParams.set('base', base);
    endpoint.searchParams.set('symbols', quote);

    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        lastError = `Frankfurter HTTP ${response.status}`;
        continue;
      }

      const payload = await response.json() as { date?: string; rates?: Record<string, number> };
      const rate = Number(payload.rates?.[quote]);
      if (!Number.isFinite(rate) || rate <= 0) continue;

      const record: FxRateRecord = {
        id,
        requestedDate,
        rateDate: payload.date || candidateDate,
        base,
        quote,
        rate,
        source: 'frankfurter',
        fetchedAt: new Date().toISOString(),
      };
      records.push(record);
      writeStore('fxRates', records);
      return record;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
}

export function handleApiRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  // Set CORS and JSON headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // --- API: Historical FX conversion with local cache ---
  // Route: /api/fx-rate?base=JPY&quote=USD&date=2026-08-17
  if (pathname === '/api/fx-rate' && method === 'GET') {
    const base = normalizeCurrency(url.searchParams.get('base'));
    const quote = normalizeCurrency(url.searchParams.get('quote'));
    const requestedDate = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

    if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid base, quote, or date' }));
      return true;
    }

    void fetchHistoricalFxRate(base, quote, requestedDate)
      .then((record) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(record));
      })
      .catch((error) => {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
    return true;
  }

  // --- API: Get all or single from store ---
  // Route: /api/data/:store OR /api/data/:store/:id
  const storeMatch = pathname.match(/^\/api\/data\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
  if (storeMatch) {
    const storeName = storeMatch[1];
    const id = storeMatch[2];

    if (method === 'GET') {
      const data = readStore(storeName);
      if (id) {
        if (storeName === 'settings') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return true;
        }
        const item = Array.isArray(data) ? data.find((i: any) => String(i.id) === id || String(i.symbol) === id) : undefined;
        if (!item) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Item not found' }));
          return true;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(item));
        return true;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return true;
    }

    if (method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (storeName === 'settings') {
            writeStore('settings', payload);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: payload }));
            return;
          }

          const list = readStore(storeName);
          const currentList = Array.isArray(list) ? list : [];
          const itemId = payload.id || payload.symbol;
          const index = currentList.findIndex((i: any) => String(i.id || i.symbol) === String(itemId));

          if (index >= 0) {
            currentList[index] = payload;
          } else {
            currentList.push(payload);
          }

          writeStore(storeName, currentList);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, data: payload }));
        } catch (e) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return true;
    }

    if (method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '[]');
          writeStore(storeName, payload);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return true;
    }

    if (method === 'DELETE') {
      if (!id) {
        // Clear store
        writeStore(storeName, storeName === 'settings' ? {} : []);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
        return true;
      }

      const list = readStore(storeName);
      if (Array.isArray(list)) {
        const filtered = list.filter((i: any) => String(i.id || i.symbol) !== id);
        writeStore(storeName, filtered);
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
      return true;
    }
  }

  // --- API: Images Upload & Retrieval ---
  // Route: /api/images/by-owner/:ownerId
  const ownerMatch = pathname.match(/^\/api\/images\/by-owner\/([a-zA-Z0-9_-]+)$/);
  if (ownerMatch && method === 'GET') {
    const ownerId = ownerMatch[1];
    const imageList = readStore('images');
    const filtered = Array.isArray(imageList) ? imageList.filter((img: any) => img.ownerId === ownerId) : [];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(filtered));
    return true;
  }

  // Route: /api/images/:id
  const imageIdMatch = pathname.match(/^\/api\/images\/([a-zA-Z0-9_-]+)$/);
  if (imageIdMatch) {
    const imgId = imageIdMatch[1];

    if (method === 'GET') {
      const imageList = readStore('images');
      const imgMeta = Array.isArray(imageList) ? imageList.find((i: any) => i.id === imgId) : null;
      const filePath = path.join(UPLOADS_DIR, `${imgId}.jpg`);

      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', imgMeta?.mimeType || 'image/jpeg');
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return true;
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Image file not found' }));
        return true;
      }
    }

    if (method === 'DELETE') {
      const imageList = readStore('images');
      const filtered = Array.isArray(imageList) ? imageList.filter((i: any) => i.id !== imgId) : [];
      writeStore('images', filtered);

      const filePath = path.join(UPLOADS_DIR, `${imgId}.jpg`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Error unlinking image:', e);
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
      return true;
    }
  }

  // Route: POST /api/images
  if (pathname === '/api/images' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { id, ownerType, ownerId, name, mimeType, dataUrl } = payload;

        if (!id || !dataUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing image id or dataUrl' }));
          return;
        }

        // Save image file to uploads folder
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(UPLOADS_DIR, `${id}.jpg`);
        fs.writeFileSync(filePath, buffer);

        // Record metadata
        const imageList = readStore('images');
        const currentImages = Array.isArray(imageList) ? imageList : [];
        const index = currentImages.findIndex((i: any) => i.id === id);
        const meta = {
          id,
          ownerType: ownerType || 'trade',
          ownerId: ownerId || '',
          name: name || 'image.jpg',
          mimeType: mimeType || 'image/jpeg',
          createdAt: payload.createdAt || new Date().toISOString(),
          url: `/api/images/${id}`,
        };

        if (index >= 0) {
          currentImages[index] = meta;
        } else {
          currentImages.push(meta);
        }

        writeStore('images', currentImages);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, image: meta }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return true;
  }

  // Route: /api/status
  if (pathname === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', storage: 'local_disk', dataDir: DATA_DIR }));
    return true;
  }

  return false;
}
