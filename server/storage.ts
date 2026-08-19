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
