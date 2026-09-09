import { describe, expect, it } from 'vitest';
import { classifyContent } from './contentViewer';

const resource = (service: string, path?: string) => ({
  service,
  name: 'Alice',
  identifier: 'one',
  path,
});

describe('content viewer media classification', () => {
  it.each([
    ['AUDIO', 'audio'],
    ['VOICE', 'audio'],
    ['PODCAST', 'audio'],
    ['VIDEO', 'video'],
    ['IMAGE', 'image'],
  ] as const)('classifies %s by service as %s', (service, kind) => {
    expect(classifyContent(resource(service))).toBe(kind);
  });

  it('classifies media inside generic file services by selected filename', () => {
    expect(classifyContent(resource('FILES', 'media/song.opus'))).toBe('audio');
    expect(classifyContent(resource('ATTACHMENT', 'media/movie.webm'))).toBe('video');
    expect(classifyContent(resource('FILE'), { filename: 'cover.avif' })).toBe('image');
  });

  it('does not apply container MIME hints to an individually selected file', () => {
    expect(classifyContent(resource('FILES', 'README.md'), { mimeType: 'video/mp4' })).toBe('markdown');
  });
});


describe('Home 2 raster stream eligibility', () => {
  it('keeps SVG and unknown images on the bounded reader and streams known raster/media types', async () => {
    const { shouldStreamContent } = await import('./contentViewer');
    expect(shouldStreamContent({ service: 'IMAGE', name: 'Example' }, { filename: 'image.svg', mimeType: 'image/svg+xml' })).toBe(false);
    expect(shouldStreamContent({ service: 'IMAGE', name: 'Example' })).toBe(false);
    expect(shouldStreamContent({ service: 'IMAGE', name: 'Example' }, { filename: 'image.png' })).toBe(true);
    expect(shouldStreamContent({ service: 'FILES', name: 'Example', path: 'image.svg' })).toBe(false);
    expect(shouldStreamContent({ service: 'AUDIO', name: 'Example' })).toBe(true);
    expect(shouldStreamContent({ service: 'VIDEO', name: 'Example' })).toBe(true);
  });
});
