type BriefReloadListener = () => void;

const listeners = new Set<BriefReloadListener>();

export function subscribeBriefReload(listener: BriefReloadListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyBriefReload(): void {
  for (const listener of listeners) {
    listener();
  }
}
