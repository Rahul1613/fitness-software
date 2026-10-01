/**
 * Compresses an image file or data URL in the browser to under ~150KB.
 * Uses an HTMLCanvasElement with progressive quality adjustment.
 */
export async function compressImage(file: File | Blob, maxSizeBytes: number = 150 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate proportional scale
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // 800px max dimension is crisp for member profile cards

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas 2D context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate approx size in bytes from base64
        const calcSize = (url: string) => Math.round((url.length * 3) / 4);

        while (calcSize(dataUrl) > maxSizeBytes && quality > 0.3) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
