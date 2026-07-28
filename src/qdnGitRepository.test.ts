import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  QdnGitRepositoryReader,
  detectGitRepositoryLayout,
  type QdnGitFileFetcher,
} from './qdnGitRepository';

function git(cwd: string, ...args: string[]) {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

async function listFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await listFiles(root, fullPath)));
    } else if (entry.isFile()) {
      paths.push(relative(root, fullPath).replaceAll('\\', '/'));
    }
  }
  return paths.sort();
}

function localFetcher(root: string, requests: Map<string, number>): QdnGitFileFetcher {
  return async (path, maxBytes) => {
    requests.set(path, (requests.get(path) ?? 0) + 1);
    const bytes = await readFile(join(root, path));
    return {
      contentLength: bytes.length,
      data: bytes.length > maxBytes ? '' : bytes.toString('base64'),
      tooLarge: bytes.length > maxBytes,
    };
  };
}

describe('detectGitRepositoryLayout', () => {
  it('recognizes worktree and bare layouts and rejects plain publications', () => {
    expect(detectGitRepositoryLayout(['README.md'])).toBeNull();
    expect(detectGitRepositoryLayout(['HEAD', 'objects/info/packs'])).toEqual({ gitdir: '/repo', kind: 'bare' });
    expect(detectGitRepositoryLayout(['.git/HEAD', '.git/objects/info/packs'])).toEqual({
      gitdir: '/repo/.git',
      kind: 'worktree',
    });
  });
});

describe('QdnGitRepositoryReader', () => {
  it('rejects unsafe and duplicate published paths', () => {
    expect(
      () => new QdnGitRepositoryReader(['.git/HEAD', '.git/objects/info/packs', '../escape'], async () => ({ data: '' })),
    ).toThrow(/Unsafe Git repository path/);
    expect(
      () => new QdnGitRepositoryReader(['.git/HEAD', '.git/HEAD', '.git/objects/info/packs'], async () => ({ data: '' })),
    ).toThrow(/duplicate paths/);
  });

  it('propagates oversized and missing file errors', async () => {
    const oversized = new QdnGitRepositoryReader(['HEAD', 'objects/info/packs'], async () => ({ data: '', tooLarge: true }));
    await expect(oversized.fs.promises.readFile('/repo/HEAD')).rejects.toThrow(/exceeds/);
    await expect(oversized.fs.promises.readFile('/repo/missing')).rejects.toThrow(/not found/);
  });

  describe('against a real git fixture', () => {
    let root = '';
    let bareParent = '';

    beforeAll(async () => {
      root = await mkdtemp(join(tmpdir(), 'qortium-explore-git-test-'));
      bareParent = await mkdtemp(join(tmpdir(), 'qortium-explore-bare-git-test-'));

      git(root, 'init', '-b', 'main');
      git(root, 'config', 'user.name', 'Qortium Test Fixture');
      git(root, 'config', 'user.email', 'fixture@qortium.invalid');

      await writeFile(join(root, 'README.md'), '# Qortium fixture\n\nInitial version.\n');
      git(root, 'add', 'README.md');
      git(root, 'commit', '-m', 'Initial fixture');

      git(root, 'switch', '-c', 'feature/greeting');
      await writeFile(join(root, 'greeting.txt'), 'Hello from the feature branch.\n');
      git(root, 'add', 'greeting.txt');
      git(root, 'commit', '-m', 'Add branch greeting');

      git(root, 'switch', 'main');
      await writeFile(join(root, 'README.md'), '# Qortium fixture\n\nMain branch update.\n');
      await writeFile(join(root, 'CHANGELOG.md'), 'Second main commit.\n');
      git(root, 'add', 'README.md', 'CHANGELOG.md');
      git(root, 'commit', '-m', 'Update main fixture');
      git(root, 'gc', '--prune=now');
    });

    afterAll(async () => {
      await rm(root, { force: true, recursive: true });
      await rm(bareParent, { force: true, recursive: true });
    });

    it('reads branches, history, trees, and blobs from a worktree publication', async () => {
      const requests = new Map<string, number>();
      const reader = new QdnGitRepositoryReader(await listFiles(root), localFetcher(root, requests));
      const overview = await reader.getOverview();

      expect(overview.currentBranch).toBe('main');
      expect(overview.branches).toEqual(['feature/greeting', 'main']);

      const mainHistory = await reader.getHistory('main');
      expect(mainHistory.map((commit) => commit.summary)).toEqual(['Update main fixture', 'Initial fixture']);
      const featureHistory = await reader.getHistory('feature/greeting');
      expect(featureHistory.map((commit) => commit.summary)).toEqual(['Add branch greeting', 'Initial fixture']);

      expect(await reader.listFiles(mainHistory[0].oid)).toEqual(['CHANGELOG.md', 'README.md']);
      expect(new TextDecoder().decode(await reader.readBlob(mainHistory[0].oid, 'README.md'))).toBe(
        '# Qortium fixture\n\nMain branch update.\n',
      );
      expect(await reader.listFiles(featureHistory[0].oid)).toEqual(['README.md', 'greeting.txt']);
      expect(new TextDecoder().decode(await reader.readBlob(featureHistory[0].oid, 'greeting.txt'))).toBe(
        'Hello from the feature branch.\n',
      );

      await reader.getOverview();
      expect(requests.get('.git/HEAD'), 'Git file reads should be cached').toBe(1);
    });

    it('reads a bare publication', async () => {
      const bareRoot = join(bareParent, 'fixture.git');
      git(root, 'clone', '--bare', root, bareRoot);
      git(bareRoot, 'gc', '--prune=now');
      const bareReader = new QdnGitRepositoryReader(await listFiles(bareRoot), localFetcher(bareRoot, new Map()));
      expect(bareReader.layout.kind).toBe('bare');
      const bareOverview = await bareReader.getOverview();
      expect(bareOverview.currentBranch).toBe('main');
      const bareHistory = await bareReader.getHistory('feature/greeting');
      expect(bareHistory[0].summary).toBe('Add branch greeting');
      expect(new TextDecoder().decode(await bareReader.readBlob(bareHistory[0].oid, 'greeting.txt'))).toBe(
        'Hello from the feature branch.\n',
      );
    });

    it('bounds compressed object expansion through the patched isomorphic-git read path', async () => {
      // A tiny compressed object must not be allowed to expand without a bound.
      // This exercises the install-time isomorphic-git hardening through the real
      // packed-object read path, not merely the post-inflate blob-size check.
      await writeFile(join(root, 'inflation-bomb.bin'), new Uint8Array(17 * 1024 * 1024));
      git(root, 'add', 'inflation-bomb.bin');
      git(root, 'commit', '-m', 'Add oversized compressed fixture');
      git(root, 'gc', '--prune=now');
      const bombReader = new QdnGitRepositoryReader(await listFiles(root), localFetcher(root, new Map()));
      const bombHistory = await bombReader.getHistory('main');
      await expect(bombReader.readBlob(bombHistory[0].oid, 'inflation-bomb.bin')).rejects.toThrow(/inflation limit/);
    });
  });
});
