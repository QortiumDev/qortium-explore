import { describe, expect, it } from 'vitest';
import { MAX_RESOURCE_FILES, resourceFetchRequest, resourceFiles } from './resourceFiles';

describe('resourceFiles', () => {
  it('returns an empty list when the metadata has no file array', () => {
    expect(resourceFiles(undefined)).toEqual([]);
    expect(resourceFiles(null)).toEqual([]);
    expect(resourceFiles({})).toEqual([]);
    expect(resourceFiles({ files: 'index.html' })).toEqual([]);
  });

  it('sorts entries and drops duplicates and non-strings', () => {
    expect(resourceFiles({ files: ['index.html', 'assets/app.js', 'index.html', 42, null] })).toEqual([
      'assets/app.js',
      'index.html',
    ]);
  });

  it('rejects absolute paths, traversal, backslashes, and control characters', () => {
    expect(
      resourceFiles({
        files: ['/etc/passwd', '../secrets', 'a/../../b', 'win\\path', 'bad\u0000name', 'x'.repeat(1_025), '  ', 'ok.txt'],
      }),
    ).toEqual(['ok.txt']);
  });

  it('keeps a dot-prefixed path that is not traversal', () => {
    expect(resourceFiles({ files: ['.gitignore', 'refs/..heads'] })).toEqual(['.gitignore', 'refs/..heads']);
  });

  it('caps very large file lists', () => {
    const files = Array.from({ length: MAX_RESOURCE_FILES + 10 }, (_, index) => `file-${index}`);
    expect(resourceFiles({ files })).toHaveLength(MAX_RESOURCE_FILES);
  });
});

describe('resourceFetchRequest', () => {
  const resource = { service: 'APP', name: 'Explore', identifier: 'Explore', path: 'favicon.ico' };

  it('asks Core for base64 when the bytes are not text', () => {
    expect(resourceFetchRequest(resource, { binary: true, maxBytes: 100 })).toEqual({
      action: 'FETCH_QDN_RESOURCE',
      encoding: 'base64',
      identifier: 'Explore',
      maxBytes: 100,
      name: 'Explore',
      path: 'favicon.ico',
      service: 'APP',
    });
  });

  it('leaves text fetches undecoded so the response stays readable', () => {
    const request = resourceFetchRequest({ service: 'APP', name: 'Explore' }, { maxBytes: 10 });
    expect(request.encoding).toBeUndefined();
    expect(request).toEqual({
      action: 'FETCH_QDN_RESOURCE',
      identifier: undefined,
      maxBytes: 10,
      name: 'Explore',
      path: undefined,
      service: 'APP',
    });
  });
});
