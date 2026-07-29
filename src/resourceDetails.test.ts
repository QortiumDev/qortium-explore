import { describe, expect, it, vi } from 'vitest';
import type { QdnRequest } from './qdnRequest';
import { loadResourceDetails } from './resourceDetails';

const resource = { service: 'IMAGE', name: 'alice', identifier: 'photo' };

describe('loadResourceDetails', () => {
  it('does not race the properties endpoint against a resource download', async () => {
    const request = vi.fn(async (value: QdnRequest) => value.action === 'GET_QDN_RESOURCE_STATUS'
      ? { status: 'PUBLISHED' }
      : { title: 'Photo' });
    const details = await loadResourceDetails(request, resource);
    expect(details.status?.status).toBe('PUBLISHED');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('loads optional properties for a ready resource', async () => {
    const request = vi.fn(async (value: QdnRequest) => {
      if (value.action === 'GET_QDN_RESOURCE_STATUS') return { status: 'READY' };
      if (value.action === 'GET_QDN_RESOURCE_PROPERTIES') return { filename: 'photo.png' };
      return { title: 'Photo' };
    });
    const details = await loadResourceDetails(request, resource);
    expect(details.properties).toEqual({ filename: 'photo.png' });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('loads optional properties for an already downloaded resource', async () => {
    const request = vi.fn(async (value: QdnRequest) => value.action === 'GET_QDN_RESOURCE_STATUS'
      ? { status: 'DOWNLOADED' }
      : value.action === 'GET_QDN_RESOURCE_PROPERTIES'
        ? { filename: 'data.json' }
        : {});
    const details = await loadResourceDetails(request, resource);
    expect(details.properties).toEqual({ filename: 'data.json' });
  });

  it('keeps usable details when an optional response fails', async () => {
    const request = vi.fn(async (value: QdnRequest) => {
      if (value.action === 'GET_QDN_RESOURCE_METADATA') throw new Error('metadata unavailable');
      return { status: 'PUBLISHED' };
    });
    await expect(loadResourceDetails(request, resource)).resolves.toMatchObject({ status: { status: 'PUBLISHED' } });
  });

  it('fails when neither metadata nor status is available', async () => {
    const request = vi.fn(async () => { throw new Error('Core unavailable'); });
    await expect(loadResourceDetails(request, resource)).rejects.toThrow('Core unavailable');
  });
});
