# Qortium Explore

Qortium Explore is a first-party QDN resource browser for discovering,
searching, inspecting, and opening public Qortium QDN resources.

QDN identity: `qdn://APP/Explore/Explore`

## Development

```bash
npm ci
npm run dev
npm test
npm run build
```

The browser development build uses the local Core read-only fallback. Full
embedded behavior, including opening resources in Qortium Home, is available
when the app is loaded through Qortium Home.

## Features

- Browse QDN services, names, and resources through deep-linkable routes.
- Search public QDN metadata with an optional service filter.
- Inspect resource metadata, status, and properties.
- Feature-detect Home's generic QDN resource viewer and use it for public
  non-browser resources, while keeping APP/WEBSITE/GAME on Home's navigation
  path and retaining the older media/document actions as compatibility
  fallbacks.
- Use Home-provided ranged URLs for lazy inline image, audio, and video
  previews. On older Home versions, bounded image/text previews and the
  existing Open actions continue to work.
- Browse the individual files of a multi-file resource, with a deep-linkable
  route per file (`#/detail/{service}/{name}/{identifier}/file/{path}`).
- View a published Git repository (bare or worktree layout) as a repository:
  current branch, latest commit, and the file tree at that commit, with safe
  in-app previews of each file's blob. All Git parsing is read-only and
  bounded; unreadable repositories fall back to the plain published-file view.
- Follow the current Qortium UI style, theme, and locale; the app includes 23
  locale catalogs.

## Publishing

Build first, then publish through a trusted local Core:

```bash
npm run build
npm run qdn:publish
```

The helper defaults to `APP/Explore/Explore`. Overrides use the
`QORTIUM_EXPLORE_` prefix, including `QDN_NAME`, `QDN_IDENTIFIER`,
`NODE_API_URL`, `NODE_API_KEY_PATH`, and `PREVIEW_ACCOUNTS_PATH`.

The helper refuses a missing or version-stale build and will not send the
preview account private key to a non-loopback plaintext HTTP node. Use a local
node or HTTPS. `QORTIUM_EXPLORE_ALLOW_REMOTE_SIGN=1` is an explicit unsafe
override for an operator who has independently accepted that risk.

## License

[0BSD](LICENSE)
