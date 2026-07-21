import { describe, expect, it } from 'vitest';
import { dispatchOpen } from './dispatcher';
const resource = (service: string) => ({ service, name: 'Alice', identifier: 'one', path: 'file.txt' });
describe('open dispatcher', () => {
  it.each(['APP', 'WEBSITE'])('routes %s to current QDN tab and optionally new tab', (service) => {
    expect(dispatchOpen(resource(service)).action).toBe('OPEN_CURRENT_TAB');
    expect(dispatchOpen(resource(service), { newTab: true }).action).toBe('OPEN_NEW_TAB');
  });
  it.each(['AUDIO', 'VOICE', 'PODCAST', 'VIDEO'])('routes %s to media player', (service) => expect(dispatchOpen(resource(service)).action).toBe('OPEN_QDN_MEDIA_PLAYER'));
  it.each(['DOCUMENT', 'FILE', 'FILES', 'ATTACHMENT'])('routes %s to document viewer', (service) => expect(dispatchOpen(resource(service)).action).toBe('OPEN_QDN_DOCUMENT_VIEWER'));
  it('keeps other services in Explore internal viewer', () => expect(dispatchOpen(resource('JSON')).action).toBe('INTERNAL_VIEWER'));
});
