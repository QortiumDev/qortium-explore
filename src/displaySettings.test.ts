// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { applyDisplaySettings, getInitialDisplaySettings, TEXT_SCALES, updateFromHostMessage } from './displaySettings';
afterEach(() => { history.replaceState(null, '', '/'); });
describe('Home appearance', () => {
  it('reads injected appearance and applies query overrides', () => {
    Object.assign(window, { _qdnTheme: 'dark', _qdnTextSize: 'huge', _qdnUiStyle: 'fun' });
    history.replaceState(null, '', '/?theme=light&lang=ar');
    expect(getInitialDisplaySettings()).toMatchObject({ theme: 'light', uiStyle: 'fun', textSize: 'huge', language: 'ar' });
    for (const key of ['_qdnTheme', '_qdnTextSize', '_qdnUiStyle']) delete (window as unknown as Record<string, unknown>)[key];
  });
  it('updates Fun/text/accent and preserves valid state on malformed messages', () => {
    const initial = getInitialDisplaySettings();
    const updated = updateFromHostMessage({ action: 'DISPLAY_SETTINGS_CHANGED', theme: 'dark', uiStyle: 'fun', textSize: 'huge', language: 'ar', accent: 'blue' }, initial)!;
    applyDisplaySettings(updated);expect(document.documentElement.style.fontSize).toBe(`${16 * TEXT_SCALES.huge}px`);expect(document.documentElement.dir).toBe('rtl');
    expect(updateFromHostMessage({ action: 'DISPLAY_SETTINGS_CHANGED', textSize: 'gigantic', theme: {} }, updated)).toEqual(updated);
    expect(updateFromHostMessage({ action: 'TEXT_SIZE_CHANGED', requestedHandler: 'other', textSize: 'small' }, updated)).toBeNull();
  });
});
