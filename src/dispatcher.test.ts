import { describe, expect, it } from 'vitest';
import { dispatchOpen } from './dispatcher';
const resource = (service: string) => ({ service, name: 'Alice', identifier: 'one', path: 'file.txt' });
describe('open dispatcher', () => {
  it.each(['APP', 'WEBSITE', 'GAME'])('routes %s to current QDN tab and optionally new tab', (service) => {
    expect(dispatchOpen(resource(service)).action).toBe('OPEN_CURRENT_TAB');
    expect(dispatchOpen(resource(service), { newTab: true }).action).toBe('OPEN_NEW_TAB');
  });
  it.each(['AUDIO', 'VOICE', 'PODCAST', 'VIDEO'])('routes %s to media player', (service) => expect(dispatchOpen(resource(service)).action).toBe('OPEN_QDN_MEDIA_PLAYER'));
  it.each(['DOCUMENT', 'FILE', 'FILES', 'ATTACHMENT'])('routes %s to document viewer', (service) => expect(dispatchOpen(resource(service)).action).toBe('OPEN_QDN_DOCUMENT_VIEWER'));
  it('keeps other services in Explore internal viewer', () => expect(dispatchOpen(resource('JSON')).action).toBe('INTERNAL_VIEWER'));
  it.each(['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'JSON', 'CODE', 'IMAGE_GALLERY', 'GIT_REPOSITORY'])(
    'routes %s to the generic Home viewer when advertised',
    (service) => expect(dispatchOpen(resource(service), { resourceViewer: true })).toEqual({
      action: 'OPEN_QDN_RESOURCE_VIEWER',
      service,
      name: 'Alice',
      identifier: 'one',
      path: 'file.txt',
      filename: undefined,
      mimeType: undefined,
    }),
  );
  it('passes selected-file hints to the generic viewer', () => {
    expect(dispatchOpen(resource('FILE'), {
      filename: 'clip.mp4',
      mimeType: 'video/mp4',
      resourceViewer: true,
    })).toMatchObject({
      action: 'OPEN_QDN_RESOURCE_VIEWER',
      filename: 'clip.mp4',
      mimeType: 'video/mp4',
      path: 'file.txt',
    });
  });
  it.each(['APP', 'WEBSITE', 'GAME'])('keeps %s on the navigation path even with the generic viewer', (service) => {
    expect(dispatchOpen(resource(service), { resourceViewer: true }).action).toBe('OPEN_CURRENT_TAB');
  });
  it('routes a lower-cased browser archive service too', () => expect(dispatchOpen(resource('game')).action).toBe('OPEN_CURRENT_TAB'));
  it('addresses a GAME by its own service', () => expect(dispatchOpen(resource('GAME'))).toEqual({ action: 'OPEN_CURRENT_TAB', address: 'qdn://GAME/Alice/one' }));
});
