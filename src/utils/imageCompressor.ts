export async function compressImageFile(
  file: File,
  maxDimension = 1800,
  quality = 0.82
): Promise<{ blob: Blob; mimeType: string }> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      ctx.drawImage(bitmap, 0, 0, width, height);
      if (bitmap.close) bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );

      return {
        blob: blob || file,
        mimeType: 'image/jpeg',
      };
    } else {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          let { width, height } = img;
          const scale = Math.min(1, maxDimension / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (b) => resolve({ blob: b || file, mimeType: 'image/jpeg' }),
              'image/jpeg',
              quality
            );
          } else {
            resolve({ blob: file, mimeType: file.type || 'image/jpeg' });
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ blob: file, mimeType: file.type || 'image/jpeg' });
        };
        img.src = url;
      });
    }
  } catch (err) {
    console.warn('Image compression fallback to raw file:', err);
    return {
      blob: file,
      mimeType: file.type || 'image/jpeg',
    };
  }
}
