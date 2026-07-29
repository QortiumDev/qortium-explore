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
