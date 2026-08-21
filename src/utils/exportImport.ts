import { getAllTrades, saveTrade } from '../db/tradeRepository';
import { getAllBlogPosts, saveBlogPost } from '../db/blogRepository';
import { getAllCustomPairs, saveCustomPair } from '../db/pairRepository';
import { getSettings, saveSettings } from '../db/settingsRepository';
import { dbGetAll, dbClear, STORES } from '../db/indexedDb';
import { ImageRecord } from '../types/trade';
import { BackupPayload } from '../types/database';
import { blobToDataUrl, dataUrlToBlob, saveImage } from '../db/imageRepository';
import { getAllAccounts, saveAccount } from '../db/accountRepository';

export async function exportBackup(): Promise<void> {
  const trades = await getAllTrades();
  const blog = await getAllBlogPosts();
  const customPairs = await getAllCustomPairs();
  const settings = await getSettings();
  const accounts = await getAllAccounts();
  const rawImages = await dbGetAll<ImageRecord>(STORES.images);

  const imagesExport: BackupPayload['images'] = [];
  for (const img of rawImages) {
    const dataUrl = img.dataUrl || (img.blob ? await blobToDataUrl(img.blob) : '');
    if (dataUrl) {
      imagesExport.push({
        id: img.id,
        ownerType: img.ownerType,
        ownerId: img.ownerId,
        name: img.name,
        mimeType: img.mimeType,
        dataUrl,
        createdAt: img.createdAt,
      });
    }
  }

  const payload: BackupPayload = {
    version: '2.1',
    exportedAt: new Date().toISOString(),
    trades,
    blog,
    customPairs,
    accounts,
    settings,
    images: imagesExport,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ tradesCount: number; blogCount: number }> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || typeof data !== 'object') {
    throw new Error('Định dạng file không hợp lệ');
  }

  // Clear existing stores before restoring
  await dbClear(STORES.trades);
  await dbClear(STORES.blog);
  await dbClear(STORES.images);
  await dbClear(STORES.customPairs);
  await dbClear(STORES.accounts);

  let tradesCount = 0;
  let blogCount = 0;

  // Restore Trades (support array or BackupPayload format)
  const tradesList = Array.isArray(data) ? data : data.trades || [];
  for (const trade of tradesList) {
    if (trade && trade.id) {
      await saveTrade(trade);
      tradesCount++;
    }
  }

  // Restore Blog
  const blogList = data.blog || data.notes || [];
  for (const post of blogList) {
    if (post && post.id) {
      await saveBlogPost(post);
      blogCount++;
    }
  }

  // Restore Custom Pairs
  if (Array.isArray(data.customPairs)) {
    for (const pair of data.customPairs) {
      if (pair && pair.symbol) {
        await saveCustomPair({
          id: pair.id || pair.symbol,
          symbol: pair.symbol,
          displayName: pair.displayName || pair.name || pair.symbol,
          assetType: pair.assetType || 'custom',
          pipSize: pair.pipSize || 0.0001,
          contractSize: pair.contractSize || 100000,
          createdAt: pair.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  if (Array.isArray(data.accounts)) {
    for (const account of data.accounts) {
      if (account?.id && account?.name) await saveAccount(account);
    }
  }

  // Restore Settings
  if (data.settings) {
    await saveSettings(data.settings);
  }

  // Restore Images
  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img.dataUrl && img.id) {
        const blob = dataUrlToBlob(img.dataUrl);
        await saveImage({
          id: img.id,
          ownerType: img.ownerType || 'trade',
          ownerId: img.ownerId || '',
          name: img.name || 'image.jpg',
          mimeType: img.mimeType || blob.type || 'image/jpeg',
          blob,
          createdAt: img.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  return { tradesCount, blogCount };
}

export async function clearAllDatabase(): Promise<void> {
  await dbClear(STORES.trades);
  await dbClear(STORES.blog);
  await dbClear(STORES.images);
  await dbClear(STORES.customPairs);
  await dbClear(STORES.accounts);
}
