import QRCode from 'qrcode';
import { getEnv } from '@booth-buddy/shared';

export interface QRCodeOptions {
  format: 'png' | 'svg';
  size?: number;
  margin?: number;
}

/**
 * Generate a QR code for an event
 */
export async function generateQRCode(
  url: string,
  options: QRCodeOptions
): Promise<Buffer | string> {
  const qrOptions = {
    width: options.size || 300,
    margin: options.margin || 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  };

  if (options.format === 'svg') {
    return QRCode.toString(url, { ...qrOptions, type: 'svg' });
  }

  return QRCode.toBuffer(url, { ...qrOptions, type: 'png' });
}

/**
 * Build the scan URL for an event
 */
export function buildScanUrl(eventSlug: string): string {
  const env = getEnv();
  return `${env.APP_URL}/scan/${eventSlug}`;
}

/**
 * Generate a URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitize a tag (lowercase, underscores instead of special chars)
 */
export function sanitizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');
}
