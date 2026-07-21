import { describe, expect, it } from 'vitest';
import { sanitizeNodePath, sanitizeReadMethod } from './qdnRequest';
describe('qdn request sanitizers', () => {
  it('requires a safe absolute node path', () => {
    expect(() => sanitizeNodePath('admin/status')).toThrow();
    expect(() => sanitizeNodePath('//host/path')).toThrow();
    expect(sanitizeNodePath('/a/../admin/status?limit=1')).toBe('/admin/status?limit=1');
  });
  it('allows only GET and HEAD', () => {
    expect(sanitizeReadMethod()).toBe('GET'); expect(sanitizeReadMethod(' head ')).toBe('HEAD');
    expect(() => sanitizeReadMethod('POST')).toThrow('Only GET and HEAD');
  });
});
