import { describe, expect, it } from 'vitest';
import {
  canStreamResource,
  GET_QDN_RESOURCE_STREAM_URL,
  OPEN_QDN_RESOURCE_VIEWER,
  resourceBridgeCapabilities,
  resourceStreamRequest,
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
});
