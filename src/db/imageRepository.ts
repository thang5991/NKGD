import { dbGet, dbPut, dbDelete, dbGetByIndex, STORES } from './indexedDb';
import { ImageRecord } from '../types/trade';

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
  const binary = atob(b64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export async function getImageById(id: string): Promise<ImageRecord | undefined> {
  const record = await dbGet<ImageRecord>(STORES.images, id);
  if (record && record.blob && !record.dataUrl) {
    record.dataUrl = await blobToDataUrl(record.blob);
  }
  return record;
}

export async function getImagesByOwner(ownerType: 'trade' | 'blog', ownerId: string): Promise<ImageRecord[]> {
  const images = await dbGetByIndex<ImageRecord>(STORES.images, 'ownerId', ownerId);
  const matching = images.filter((img) => img.ownerType === ownerType);
  for (const img of matching) {
    if (img.blob && !img.dataUrl) {
      img.dataUrl = await blobToDataUrl(img.blob);
    }
  }
  return matching;
}

export async function getImagesByIds(ids: string[]): Promise<ImageRecord[]> {
  const results: ImageRecord[] = [];
  for (const id of ids) {
    const img = await getImageById(id);
    if (img) results.push(img);
  }
  return results;
}

export async function saveImage(image: ImageRecord): Promise<void> {
  // Store blob in DB; dataUrl is stripped before saving to keep record lightweight
  const toStore: ImageRecord = {
    id: image.id,
    ownerType: image.ownerType,
    ownerId: image.ownerId,
    name: image.name,
    mimeType: image.mimeType || image.blob.type || 'image/jpeg',
    blob: image.blob,
    createdAt: image.createdAt || new Date().toISOString(),
  };
  await dbPut(STORES.images, toStore);
}

export async function deleteImage(id: string): Promise<void> {
  await dbDelete(STORES.images, id);
}

export async function deleteImagesByOwner(ownerType: 'trade' | 'blog', ownerId: string): Promise<void> {
  const images = await getImagesByOwner(ownerType, ownerId);
  for (const img of images) {
    await deleteImage(img.id);
  }
}
