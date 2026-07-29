import { describe, expect, it } from 'vitest';
import {
  canStreamResource,
  GET_QDN_RESOURCE_STREAM_URL,
  OPEN_QDN_RESOURCE_VIEWER,
  resourceBridgeCapabilities,
  resourceStreamRequest,
  safeQdnStreamUrl,
} from './resourceBridge';

describe('Home resource bridge capabilities', () => {
  it('feature-detects the viewer and stream actions independently', () => {
    expect(resourceBridgeCapabilities([
      'SHOW_ACTIONS',
      GET_QDN_RESOURCE_STREAM_URL,
      OPEN_QDN_RESOURCE_VIEWER,
    ])).toEqual({ resourceViewer: true, streamUrl: true });
    expect(resourceBridgeCapabilities([GET_QDN_RESOURCE_STREAM_URL])).toEqual({
      resourceViewer: false,
      streamUrl: true,
    });
    expect(resourceBridgeCapabilities({ actions: [OPEN_QDN_RESOURCE_VIEWER] })).toEqual({
      resourceViewer: false,
      streamUrl: false,
    });
  });

  it.each([
    'IMAGE',
    'THUMBNAIL',
    'QCHAT_IMAGE',
    'AUDIO',
    'VOICE',
    'PODCAST',
    'VIDEO',
    'DOCUMENT',
    'FILE',
    'FILES',
    'ATTACHMENT',
  ])('allows Home-supported %s resources to stream', (service) => {
    expect(canStreamResource({ service })).toBe(true);
  });

  it.each(['APP', 'WEBSITE', 'GAME', 'JSON', 'CODE', 'GIT_REPOSITORY'])(
    'does not request a stream URL for %s',
    (service) => {
      expect(canStreamResource({ service })).toBe(false);
    },
  );

  it('builds a minimal descriptor without leaking host credentials', () => {
    expect(resourceStreamRequest(
      {
        service: 'file',
        name: 'Alice',
        identifier: 'clip',
        path: 'media/demo.mp4',
      },
      { filename: 'demo.mp4', mimeType: 'video/mp4' },
    )).toEqual({
      action: GET_QDN_RESOURCE_STREAM_URL,
      service: 'FILE',
      name: 'Alice',
      identifier: 'clip',
      path: 'media/demo.mp4',
      filename: 'demo.mp4',
      mimeType: 'video/mp4',
    });
  });

  it('accepts only credential-free HTTP(S) stream URLs', () => {
    expect(safeQdnStreamUrl('https://node.example/render/VIDEO/Alice/clip')).toBe(
      'https://node.example/render/VIDEO/Alice/clip',
    );
    expect(safeQdnStreamUrl('http://127.0.0.1:24891/render/AUDIO/Alice/clip')).toBe(
      'http://127.0.0.1:24891/render/AUDIO/Alice/clip',
    );
    expect(() => safeQdnStreamUrl('javascript:alert(1)')).toThrow('unsafe media URL');
    expect(() => safeQdnStreamUrl('data:text/html,<script>alert(1)</script>')).toThrow('unsafe media URL');
    expect(() => safeQdnStreamUrl('https://user:secret@node.example/render/IMAGE/Alice/clip')).toThrow(
      'unsafe media URL',
    );
    expect(() => safeQdnStreamUrl('/render/IMAGE/Alice/clip')).toThrow();
    expect(() => safeQdnStreamUrl(null)).toThrow('did not return a media URL');
  });
});
