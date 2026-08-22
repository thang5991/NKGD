import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const AUTH_COOKIE = 'nkgd_session';
const SESSION_TTL = 12 * 60 * 60 * 1000;
const sessions = new Map<string, number>();
const DATA_STORES = new Set(['trades', 'blog', 'images', 'customPairs', 'settings', 'accounts']);

function configuredPassword(): string {
  return String(process.env.NKGD_APP_PASSWORD || '');
}

function verifyConfiguredPassword(password: string): boolean {
  const expected = createHash('sha256').update(configuredPassword()).digest();
  const actual = createHash('sha256').update(password).digest();
  return timingSafeEqual(expected, actual);
}

function readCookies(req: IncomingMessage): Record<string, string> {
  return String(req.headers.cookie || '').split(';').reduce<Record<string, string>>((result, part) => {
    const separator = part.indexOf('=');
    if (separator > 0) result[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
    return result;
  }, {});
}

function isAuthenticated(req: IncomingMessage): boolean {
  const token = readCookies(req)[AUTH_COOKIE];
  const expiresAt = token ? sessions.get(token) : undefined;
  if (!token || !expiresAt || expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return false;
  }
  return true;
}

function createSession(res: ServerResponse): void {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL);
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/`);
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 16_384) reject(new Error('Payload quá lớn'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}') as Record<string, unknown>); }
      catch { reject(new Error('JSON không hợp lệ')); }
    });
  });
}

function jsonResponse(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

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

interface EconomicEventRecord {
  id: string;
  date: string;
  currency: string;
  country: string;
  title: string;
  category?: string;
  importance: 1 | 2 | 3;
  actual?: string;
  forecast?: string;
  previous?: string;
  revised?: string;
  unit?: string;
  source: string;
  sourceUrl?: string;
}

interface EconomicCacheEntry {
  events: EconomicEventRecord[];
  source: string;
  fetchedAt: string;
  expiresAt: number;
}

const economicCache = new Map<string, EconomicCacheEntry>();
const ECONOMIC_CACHE_TTL = 10 * 60 * 1000;

const COUNTRY_CURRENCIES: Record<string, string> = {
  'united states': 'USD',
  'euro area': 'EUR',
  germany: 'EUR',
  france: 'EUR',
  italy: 'EUR',
  spain: 'EUR',
  'united kingdom': 'GBP',
  japan: 'JPY',
  australia: 'AUD',
  canada: 'CAD',
  switzerland: 'CHF',
  'new zealand': 'NZD',
  china: 'CNY',
};

function normalizeEventDate(value: string): string {
  if (!value) return '';
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = new Date(hasTimeZone ? value : value + 'Z');
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function dateKeyInVietnam(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return [read('year'), read('month'), read('day')].join('-');
}

function countryCurrency(country: string, fallback = ''): string {
  return fallback.toUpperCase().match(/^[A-Z]{3}$/)?.[0]
    || COUNTRY_CURRENCIES[country.toLowerCase()]
    || '';
}

function importanceNumber(value: unknown): 1 | 2 | 3 {
  const normalized = String(value || '').toLowerCase();
  if (normalized === '3' || normalized === 'high') return 3;
  if (normalized === '2' || normalized === 'medium') return 2;
  return 1;
}

async function fetchTradingEconomicsCalendar(
  from: string,
  to: string,
  apiKey: string
): Promise<EconomicEventRecord[]> {
  const endpoint = new URL('https://api.tradingeconomics.com/calendar/country/All/' + from + '/' + to);
  endpoint.searchParams.set('c', apiKey);
  endpoint.searchParams.set('f', 'json');
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Trading Economics HTTP ' + response.status);
  const payload = await response.json() as Array<Record<string, unknown>>;
  if (!Array.isArray(payload)) throw new Error('Dữ liệu Trading Economics không hợp lệ');

  return payload.map((item) => {
    const country = String(item.Country || '');
    const relativeUrl = String(item.URL || '');
    return {
      id: 'te-' + String(item.CalendarId || item.Ticker || Math.random()),
      date: normalizeEventDate(String(item.Date || '')),
      currency: countryCurrency(country, String(item.Currency || '')),
      country,
      title: String(item.Event || item.Category || 'Sự kiện kinh tế'),
      category: String(item.Category || ''),
      importance: importanceNumber(item.Importance),
      actual: String(item.Actual || ''),
      forecast: String(item.Forecast || item.TEForecast || ''),
      previous: String(item.Previous || ''),
      revised: String(item.Revised || ''),
      unit: String(item.Unit || ''),
      source: 'Trading Economics',
      sourceUrl: relativeUrl ? 'https://tradingeconomics.com' + relativeUrl : undefined,
    };
  }).filter((event) => event.date);
}

async function fetchFairEconomyCalendar(): Promise<EconomicEventRecord[]> {
  const feeds = ['lastweek', 'thisweek', 'nextweek'];
  const responses = await Promise.allSettled(
    feeds.map(async (period) => {
      const response = await fetch('https://nfs.faireconomy.media/ff_calendar_' + period + '.json', {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Fair Economy HTTP ' + response.status);
      return response.json() as Promise<Array<Record<string, unknown>>>;
    })
  );

  const payload = responses.flatMap((result) => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
  if (payload.length === 0) throw new Error('Không lấy được dữ liệu lịch kinh tế dự phòng');

  const seen = new Set<string>();
  return payload.map((item) => {
    const date = normalizeEventDate(String(item.date || ''));
    const currency = String(item.country || '').toUpperCase();
    const title = String(item.title || 'Sự kiện kinh tế');
    const id = ['fe', date, currency, title].join('-');
    return {
      id,
      date,
      currency,
      country: currency,
      title,
      importance: importanceNumber(item.impact),
      actual: String(item.actual || ''),
      forecast: String(item.forecast || ''),
      previous: String(item.previous || ''),
      source: 'Fair Economy',
      sourceUrl: 'https://www.forexfactory.com/calendar',
    } as EconomicEventRecord;
  }).filter((event) => {
    if (!event.date || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

async function getEconomicCalendar(from: string, to: string, forceRefresh: boolean) {
  const cacheKey = from + ':' + to;
  const cached = economicCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return { ...cached, cached: true };
  }

  const apiKey = (process.env.TRADING_ECONOMICS_API_KEY || '').trim();
  let events: EconomicEventRecord[] = [];
  let source = 'Fair Economy';

  if (apiKey) {
    try {
      events = await fetchTradingEconomicsCalendar(from, to, apiKey);
      source = 'Trading Economics';
    } catch (error) {
      console.warn('Trading Economics failed, using fallback:', error);
    }
  }

  if (events.length === 0) {
    events = await fetchFairEconomyCalendar();
  }

  events = events
    .filter((event) => {
      const dateKey = dateKeyInVietnam(event.date);
      return dateKey >= from && dateKey <= to;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const entry: EconomicCacheEntry = {
    events,
    source,
    fetchedAt: new Date().toISOString(),
    expiresAt: Date.now() + ECONOMIC_CACHE_TTL,
  };
  economicCache.set(cacheKey, entry);
  return { ...entry, cached: false };
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

  // --- API: Local password authentication ---
  if (pathname === '/api/auth/status' && method === 'GET') {
    jsonResponse(res, 200, { configured: configuredPassword().length >= 6, authenticated: isAuthenticated(req) });
    return true;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    void readJsonBody(req).then((body) => {
      if (configuredPassword().length < 6) {
        return jsonResponse(res, 503, { error: 'Chưa cấu hình NKGD_APP_PASSWORD trong file .env' });
      }
      if (!verifyConfiguredPassword(String(body.password || ''))) return jsonResponse(res, 401, { error: 'Mật khẩu không đúng' });
      createSession(res);
      jsonResponse(res, 200, { success: true });
    }).catch((error) => jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) }));
    return true;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = readCookies(req)[AUTH_COOKIE];
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    jsonResponse(res, 200, { success: true });
    return true;
  }

  if (pathname.startsWith('/api/') && pathname !== '/api/status' && !isAuthenticated(req)) {
    jsonResponse(res, 401, { error: 'Yêu cầu đăng nhập' });
    return true;
  }

  // --- API: Economic calendar (Trading Economics + public fallback) ---
  if (pathname === '/api/economic-calendar' && method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const from = url.searchParams.get('from') || today;
    const to = url.searchParams.get('to') || from;
    const validDate = /^\d{4}-\d{2}-\d{2}$/;
    const spanDays = (new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()) / 86400000;

    if (!validDate.test(from) || !validDate.test(to) || spanDays < 0 || spanDays > 31) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Khoảng ngày không hợp lệ hoặc vượt quá 31 ngày' }));
      return true;
    }

    void getEconomicCalendar(from, to, url.searchParams.has('refresh'))
      .then((result) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          events: result.events,
          source: result.source,
          fetchedAt: result.fetchedAt,
          cached: result.cached,
        }));
      })
      .catch((error) => {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
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

    if (!DATA_STORES.has(storeName)) {
      jsonResponse(res, 404, { error: 'Store không tồn tại' });
      return true;
    }

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
