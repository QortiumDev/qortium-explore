import { isRtlLanguage, normalizeLanguage, type SupportedLanguage } from './i18n';
export const TEXT_SCALES = { 'extra-small': .85, small: .925, medium: 1, large: 1.15, 'extra-large': 1.35, huge: 2.1 } as const;
const accents = { clay: 19, green: 155, blue: 215, orange: 28, purple: 275, red: 0, teal: 175, cyan: 190, pink: 330, yellow: 48 } as const;
export type QdnTheme = 'light' | 'dark';
export type QdnUiStyle = 'classic' | 'modern' | 'fun';
export type QdnDisplaySettings = { language: SupportedLanguage; theme: QdnTheme; uiStyle: QdnUiStyle; textSize: keyof typeof TEXT_SCALES; accent: keyof typeof accents };
const defaults: QdnDisplaySettings = { language: 'en', theme: 'light', uiStyle: 'classic', textSize: 'medium', accent: 'green' };
function option<T extends string>(value: unknown, choices: readonly T[]): T | null {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return choices.includes(normalized as T) ? normalized as T : null;
}
function normalized(item: Record<string, unknown>, current: QdnDisplaySettings): QdnDisplaySettings {
  return {
    theme: option(item.theme ?? item.qdnTheme ?? item._qdnTheme, ['light', 'dark']) ?? current.theme,
    uiStyle: option(item.uiStyle ?? item.ui ?? item.qdnUiStyle ?? item.qdnUIStyle ?? item._qdnUiStyle ?? item._qdnUIStyle, ['classic', 'modern', 'fun']) ?? current.uiStyle,
    language: normalizeLanguage(item.language ?? item.lang ?? item.qdnLang ?? item.qdnLanguage ?? item._qdnLang ?? item._qdnLanguage) ?? current.language,
    textSize: option(item.textSize ?? item.qdnTextSize ?? item._qdnTextSize, Object.keys(TEXT_SCALES) as QdnDisplaySettings['textSize'][]) ?? current.textSize,
    accent: option(item.accent ?? item.qdnAccent ?? item._qdnAccent, Object.keys(accents) as QdnDisplaySettings['accent'][]) ?? current.accent,
  };
}
export function getInitialDisplaySettings(): QdnDisplaySettings {
  if (typeof window === 'undefined') return { ...defaults };
  const query = Object.fromEntries(new URLSearchParams(window.location.search));
  query.uiStyle ??= query['ui-style']; query.textSize ??= query['text-size'];
  return normalized(query, normalized(window as unknown as Record<string, unknown>, defaults));
}
export function applyDisplaySettings(settings: QdnDisplaySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = settings.theme; root.dataset.ui = settings.uiStyle;
  root.dataset.textSize = settings.textSize; root.dataset.accent = settings.accent;
  root.lang = settings.language; root.dir = isRtlLanguage(settings.language) ? 'rtl' : 'ltr'; root.style.colorScheme = settings.theme;
  root.style.fontSize = `${16 * TEXT_SCALES[settings.textSize]}px`;
  root.style.setProperty('--accent-hue', String(accents[settings.accent]));
}
export function updateFromHostMessage(data: unknown, current: QdnDisplaySettings): QdnDisplaySettings | null {
  if (!data || typeof data !== 'object') return null;
  const item = data as Record<string, unknown>;
  if (item.requestedHandler && item.requestedHandler !== 'UI') return null;
  if (!['THEME_CHANGED', 'UI_STYLE_CHANGED', 'DISPLAY_SETTINGS_CHANGED', 'LANGUAGE_CHANGED', 'TEXT_SIZE_CHANGED', 'ACCENT_CHANGED'].includes(String(item.action))) return null;
  return normalized(item, current);
}
