/**
 * Image compression and validation utility for event form photo uploads
 * Enforces strict 5MB limit, valid image MIME types, and client-side canvas compression.
 */

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file
export const MAX_PHOTO_SIZE_LABEL = '5 MB';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  fileName: string;
  mimeType: string;
}

/**
 * Validates a file against size and type constraints before upload
 */
export function validatePhotoUpload(file: File | { size: number; type: string; name?: string }): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // 1. Strict 5 MB file size limit enforcement
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Maximum allowed size is 5 MB per photo.`,
    };
  }

  // 2. Validate MIME type
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasValidExt = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name);

  if (mime && !ALLOWED_IMAGE_TYPES.includes(mime) && !hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a valid image (JPG, PNG, or WebP).',
    };
  }

  return { valid: true };
}

/**
 * Compresses and optimizes an image file before storage
 * - Resizes excessively large dimensions to a maximum of 1600x1600 while preserving aspect ratio
 * - Compresses with high-quality canvas rendering to reduce storage footprint
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputType?: string;
  } = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    outputType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Initial validation
    const validation = validatePhotoUpload(file);
    if (!validation.valid) {
      return reject(new Error(validation.error));
    }

    // 2. Load file into Image object
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale dimensions while maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas 2D rendering context not available.'));
          }

          // Fill with clean background for transparent PNG to JPEG conversions
          if (outputType === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Generate Data URL
          const dataUrl = canvas.toDataURL(outputType, quality);

          // Generate Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Failed to compress image into blob.'));
              }

              const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
              const extension = outputType === 'image/webp' ? '.webp' : '.jpg';
              const compressedFileName = `${cleanBaseName}-opt${extension}`;

              resolve({
                blob,
                dataUrl,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size,
                fileName: compressedFileName,
                mimeType: outputType,
              });
            },
            outputType,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
