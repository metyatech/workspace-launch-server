import { describe, it, expect } from 'vitest';
import { sanitize, safeJoin } from './storage.js';
import path from 'path';

describe('storage utils', () => {
  describe('sanitize', () => {
    it('should replace invalid characters with underscore', () => {
      expect(sanitize('foo/bar')).toBe('foo_bar');
      expect(sanitize('foo\\bar')).toBe('foo_bar');
      expect(sanitize('foo:bar')).toBe('foo_bar');
      expect(sanitize('valid-name_123')).toBe('valid-name_123');
    });

    it('should handle empty or null values', () => {
      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize('')).toBe('');
    });
  });

  describe('safeJoin', () => {
    const root = path.resolve('/tmp/root');

    it('should join paths correctly', () => {
      expect(safeJoin(root, 'foo')).toBe(path.join(root, 'foo'));
    });

    it('should prevent path traversal', () => {
      expect(() => safeJoin(root, '../foo')).toThrow('path traversal detected');
      expect(() => safeJoin(root, '/etc/passwd')).toThrow('path traversal detected');
    });
  });
});
