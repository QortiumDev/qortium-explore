import { EN_STRINGS } from './en';

export type Messages = Record<keyof typeof EN_STRINGS, string>;

// Every locale deliberately contains every key. A concise mechanical base keeps
// newly added Explore labels readable until first-party linguistic review.
export function completeCatalog(overrides: Partial<Messages> = {}): Messages {
  return { ...EN_STRINGS, ...overrides };
}
