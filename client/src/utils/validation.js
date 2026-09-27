import { formatBytes } from './format.js';

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Client-side pre-checks. The server re-validates everything (including real file content). */
export function validateImageFile(file, maxMb) {
  if (!file) return 'No file selected.';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Unsupported file type. Upload a PNG, JPG/JPEG or WEBP image.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > maxMb * 1024 * 1024) return `The image is ${formatBytes(file.size)}, which exceeds the ${maxMb} MB limit.`;
  return null;
}

export function validateUrlInput(value) {
  const v = value.trim();
  if (!v) return 'Enter a URL to analyse.';
  if (/\s/.test(v)) return 'A URL cannot contain spaces.';
  const scheme = /^([a-z][a-z0-9+.-]*):(?!\d)/i.exec(v)?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return 'Only http:// and https:// URLs can be analysed.';
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `http://${v}`);
    if (!u.hostname.includes('.') && !u.hostname.startsWith('[')) return 'The URL does not contain a valid domain.';
  } catch {
    return 'This does not look like a valid URL.';
  }
  return null;
}
