/**
 * High-Performance Client-Side 360° Image Compressor
 * Optimized for handling huge 25MB+ equirectangular photos efficiently
 */

/**
 * Compresses raw 360° photo file (25MB+) to an optimized equirectangular JPEG (~1.5-2.5MB).
 * Uses Canvas hardware acceleration with URL.createObjectURL for zero-memory bloat.
 * 
 * @param {File} imageFile - Raw image file picked by user
 * @param {Object} options - { maxWidth: 4096, quality: 0.82 }
 * @param {Function} onProgress - Progress callback (0 - 100)
 * @returns {Promise<{ compressedFile: File, originalSizeMB: string, compressedSizeMB: string, reductionRatio: string }>}
 */
export async function compress360Image(imageFile, options = {}, onProgress = () => {}) {
  const maxWidth = options.maxWidth || 4096;
  const quality = options.quality || 0.82;
  const originalSizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);

  onProgress(10);

  return new Promise((resolve, reject) => {
    // Create fast blob URL (avoid base64 memory overhead)
    const objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();

    img.onload = () => {
      onProgress(40);
      try {
        let width = img.width;
        let height = img.height;

        // Downscale equirectangular width to 4096px while keeping 2:1 aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        onProgress(70);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              return reject(new Error('Canvas compression failed to generate image blob.'));
            }

            const compressedFile = new File(
              [blob],
              imageFile.name.replace(/\.[^/.]+$/, "") + "_360_compressed.jpg",
              { type: 'image/jpeg', lastModified: Date.now() }
            );

            const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
            const rawSavings = Math.round((1 - compressedFile.size / imageFile.size) * 100);
            const reductionRatio = `${Math.max(0, rawSavings)}%`;

            onProgress(100);

            resolve({
              compressedFile,
              originalSizeMB,
              compressedSizeMB,
              reductionRatio
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file into memory for compression.'));
    };

    img.src = objectUrl;
  });
}
