import { useEffect, useState, type ReactNode } from 'react';
import { createTranslator, type SupportedLanguage } from './i18n';
import { Reference } from './Reference';
import { readWorkspace, workspaceUrl, type ExploreWorkspace } from './workspaceRoute';

/** Keep the browser subtree mounted, including search and Git file selection. */
export function Workspace({ children, language }: { children: ReactNode; language: SupportedLanguage }) {
  const [view, setView] = useState(() => readWorkspace(window.location.href));
  const t = createTranslator(language);
  useEffect(() => {
    if (readWorkspace(window.location.href) === 'developers') {
      const url = workspaceUrl(window.location.href, 'developers');
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
    }
    const restore = () => setView(readWorkspace(window.location.href));
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  function visit(next: ExploreWorkspace) {
    const url = workspaceUrl(window.location.href, next);
    if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url);
    setView(next);
    document.scrollingElement?.scrollTo?.({ top: 0 });
  }
  return <>
    <nav className="workspace-tabs" aria-label="Explore workspaces">
      <button type="button" aria-pressed={view === 'browse'} onClick={() => visit('browse')}>{t('workspace.browse')}</button>
      <button type="button" aria-pressed={view === 'developers'} onClick={() => visit('developers')}>{t('workspace.developers')}</button>
    </nav>
    <div className="browse-workspace" hidden={view !== 'browse'}>{children}</div>
    {view === 'developers' && <main className="app developer-workspace"><header className="top"><h1>{t('app.title')} <small>{__APP_VERSION__}</small></h1></header><Reference /></main>}
  </>;
}
