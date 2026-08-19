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
  try {
    const res = await fetch(`/api/images/${encodeURIComponent(id)}`);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    return {
      id,
      ownerType: 'trade',
      ownerId: '',
      name: `${id}.jpg`,
      mimeType: blob.type || 'image/jpeg',
      blob,
      dataUrl,
      createdAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error(`Error loading image ${id}:`, e);
    return undefined;
  }
}

export async function getImagesByOwner(ownerType: 'trade' | 'blog', ownerId: string): Promise<ImageRecord[]> {
  try {
    const res = await fetch(`/api/images/by-owner/${encodeURIComponent(ownerId)}`);
    if (!res.ok) return [];
    const metaList: any[] = await res.json();
    const results: ImageRecord[] = [];

    for (const item of metaList) {
      if (item.ownerType === ownerType) {
        results.push({
          id: item.id,
          ownerType: item.ownerType,
          ownerId: item.ownerId,
          name: item.name,
          mimeType: item.mimeType,
          dataUrl: `/api/images/${item.id}`,
          blob: new Blob([], { type: item.mimeType }),
          createdAt: item.createdAt,
        });
      }
    }
    return results;
  } catch (e) {
    console.error(`Error loading images for owner ${ownerId}:`, e);
    return [];
  }
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
  const dataUrl = image.dataUrl || (image.blob ? await blobToDataUrl(image.blob) : '');
  if (!dataUrl) return;

  const payload = {
    id: image.id,
    ownerType: image.ownerType,
    ownerId: image.ownerId,
    name: image.name,
    mimeType: image.mimeType || 'image/jpeg',
    dataUrl,
    createdAt: image.createdAt || new Date().toISOString(),
  };

  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save image to local disk: ${res.statusText}`);
  }
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`/api/images/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete image: ${res.statusText}`);
  }
}

export async function deleteImagesByOwner(ownerType: 'trade' | 'blog', ownerId: string): Promise<void> {
  const images = await getImagesByOwner(ownerType, ownerId);
  for (const img of images) {
    try {
      await deleteImage(img.id);
    } catch (e) {
      console.error(`Failed to delete image ${img.id}:`, e);
    }
  }
}
