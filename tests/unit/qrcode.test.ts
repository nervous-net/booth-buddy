import { describe, it, expect } from 'vitest';
import { slugify, sanitizeTag, buildScanUrl } from '../../packages/web/src/services/qrcode';

describe('QR Code Service', () => {
  describe('slugify', () => {
    it('converts text to lowercase slug', () => {
      expect(slugify('ComicCon 2026')).toBe('comiccon-2026');
    });

    it('replaces special characters with dashes', () => {
      expect(slugify('Event @ The Park!')).toBe('event-the-park');
    });

    it('removes leading and trailing dashes', () => {
      expect(slugify('  Event Name  ')).toBe('event-name');
    });

    it('handles multiple consecutive special chars', () => {
      expect(slugify('Event---Name___Test')).toBe('event-name-test');
    });

    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });
  });

  describe('sanitizeTag', () => {
    it('converts to lowercase with underscores', () => {
      expect(sanitizeTag('booth-comiccon2026')).toBe('booth_comiccon2026');
    });

    it('replaces special characters with underscores', () => {
      // Note: multiple consecutive special chars become multiple underscores
      expect(sanitizeTag('Event @ The Park!')).toBe('event___the_park');
    });

    it('removes leading and trailing underscores', () => {
      expect(sanitizeTag('__tag__')).toBe('tag');
    });

    it('handles empty string', () => {
      expect(sanitizeTag('')).toBe('');
    });
  });

  describe('buildScanUrl', () => {
    it.skip('builds scan URL with event slug', () => {
      // Skipped: requires env validation (integration test)
      const url = buildScanUrl('comiccon-2026');
      expect(url).toContain('/scan/comiccon-2026');
    });
  });
});
