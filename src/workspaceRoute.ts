export type ExploreWorkspace = 'browse' | 'developers';
const aliases = ['developers', 'developer', 'reference'];
export function readWorkspace(input: string | URL): ExploreWorkspace {
  const url = new URL(input, 'http://localhost');
  return aliases.includes(url.searchParams.get('view') ?? '') ? 'developers' : 'browse';
}
export function workspaceUrl(input: string | URL, view: ExploreWorkspace): URL {
  const url = new URL(input, 'http://localhost');
  if (view === 'developers') url.searchParams.set('view', 'developers');
  else { url.searchParams.delete('view'); url.searchParams.delete('section'); }
  return url;
}
