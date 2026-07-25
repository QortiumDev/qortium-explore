import { useEffect, useState } from 'react';
import { createAvatarObjectUrl, initialsForName, loadNameAvatar, type AccountAvatarReady, type NameAvatarResult } from './avatarClient';
import { createTranslator } from './i18n';
import { qdnRequest } from './qdnRequest';

function avatarAddress(result: NameAvatarResult | null) {
  return result?.address ?? null;
}

function readyAvatar(result: NameAvatarResult | null): AccountAvatarReady | null {
  return result?.kind === 'ready' ? result : null;
}

export function NameOwnerIdentity({ language, name }: { language: unknown; name: string }) {
  const [result, setResult] = useState<NameAvatarResult | null>(null);
  const [src, setSrc] = useState<string>();
  const t = createTranslator(language);
  const address = avatarAddress(result);
  const avatar = readyAvatar(result);

  useEffect(() => {
    let active = true;
    let retryTimer: number | undefined;
    const load = async () => {
      const next = await loadNameAvatar(name, qdnRequest);
      if (!active) return;
      setResult(next);
      if (next.kind === 'pending') {
        const seconds = Math.min(Math.max(next.retryAfterSeconds ?? 5, 1), 30);
        retryTimer = window.setTimeout(() => { void load(); }, seconds * 1000);
      }
    };
    setResult(null);
    void load();
    return () => { active = false; if (retryTimer !== undefined) window.clearTimeout(retryTimer); };
  }, [name]);

  useEffect(() => {
    if (!avatar) {
      if (result?.kind !== 'pending') setSrc(undefined);
      return;
    }
    const objectUrl = createAvatarObjectUrl(avatar);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatar, result?.kind]);

  return <div className="name-owner">
    {src ? <img className="name-owner__avatar" alt="" src={src} /> : <span className="name-owner__fallback" aria-hidden="true">{initialsForName(name)}</span>}
    <div className="name-owner__text">
      <span className="name-owner__label">{t('label.nameOwner')}</span>
      <strong>{name}</strong>
      {address ? <span className="name-owner__address">{address}</span> : null}
    </div>
  </div>;
}
