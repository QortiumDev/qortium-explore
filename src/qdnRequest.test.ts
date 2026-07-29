import { describe, expect, it } from 'vitest';
import { LOCAL_READ_ACTIONS, resourcePath, resourceRenderPath, sanitizeNodePath, sanitizeReadMethod } from './qdnRequest';
describe('qdn request sanitizers', () => {
  it('requires a safe absolute node path', () => {
    expect(() => sanitizeNodePath('admin/status')).toThrow();
    expect(() => sanitizeNodePath('//host/path')).toThrow();
    expect(sanitizeNodePath('/a/../admin/status?limit=1')).toBe('/admin/status?limit=1');
  });
  it('asks Core for base64 so the text-only fallback does not corrupt bytes', () => {
    const resource = { action: 'FETCH_QDN_RESOURCE', service: 'APP', name: 'Explore', identifier: 'Explore', path: 'icon.png' };
    expect(resourcePath({ ...resource, encoding: 'base64' }, 'fetch')).toBe('/arbitrary/APP/Explore/Explore?filepath=icon.png&encoding=base64');
    expect(resourcePath(resource, 'fetch')).toBe('/arbitrary/APP/Explore/Explore?filepath=icon.png');
    expect(resourcePath({ ...resource, encoding: 'javascript:' }, 'fetch')).toBe('/arbitrary/APP/Explore/Explore?filepath=icon.png');
  });
  it('allows only GET and HEAD', () => {
    expect(sanitizeReadMethod()).toBe('GET'); expect(sanitizeReadMethod(' head ')).toBe('HEAD');
    expect(() => sanitizeReadMethod('POST')).toThrow('Only GET and HEAD');
  });
  it('advertises and builds local ranged render URLs for browser development', () => {
    expect(LOCAL_READ_ACTIONS).toContain('GET_QDN_RESOURCE_STREAM_URL');
    expect(resourceRenderPath({
      action: 'GET_QDN_RESOURCE_STREAM_URL',
      service: 'file',
      name: 'Alice Example',
      identifier: 'clip',
      path: 'media/demo one.mp4?download=false',
    })).toBe('/render/FILE/Alice%20Example/clip/media/demo%20one.mp4?download=false');
    expect(() => resourceRenderPath({
      action: 'GET_QDN_RESOURCE_STREAM_URL',
      service: 'JSON',
      name: 'Alice',
    })).toThrow('does not support inline streaming');
  });
});
