import { useEffect, useRef, useState, type DependencyList } from "react";

type FallbackValue<T> = T | (() => T);

type GameModeHubBootstrapOptions<TLocal, TRemote, TCommunity> = {
  deps: DependencyList;
  enabled?: boolean;
  loadLocal: () => TLocal;
  applyLocal: (local: TLocal) => void;
  fetchRemote?: (local: TLocal) => Promise<TRemote>;
  applyRemote?: (remote: TRemote, local: TLocal) => void;
  onRemoteError?: (local: TLocal, error: unknown) => void;
  offlineMessage?: string | null;
  fetchCommunity: () => Promise<TCommunity>;
  applyCommunity: (community: TCommunity) => void;
  communityFallback: FallbackValue<TCommunity>;
};

function resolveFallback<T>(value: FallbackValue<T>) {
  return typeof value === "function" ? (value as () => T)() : value;
}

export function useGameModeHubBootstrap<TLocal, TRemote, TCommunity>(
  options: GameModeHubBootstrapOptions<TLocal, TRemote, TCommunity>
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const {
        enabled = true,
        loadLocal,
        applyLocal,
        fetchRemote,
        applyRemote,
        onRemoteError,
        offlineMessage = null,
        fetchCommunity,
        applyCommunity,
        communityFallback,
      } = optionsRef.current;

      setLoading(true);
      setSyncError(null);

      const local = loadLocal();
      if (!cancelled) {
        applyLocal(local);
      }

      if (enabled && fetchRemote && applyRemote) {
        try {
          const remote = await fetchRemote(local);
          if (!cancelled) {
            applyRemote(remote, local);
          }
        } catch (error) {
          if (!cancelled) {
            onRemoteError?.(local, error);
            setSyncError(offlineMessage);
          }
        }
      }

      try {
        const community = await fetchCommunity();
        if (!cancelled) {
          applyCommunity(community);
        }
      } catch {
        if (!cancelled) {
          applyCommunity(resolveFallback(communityFallback));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, options.deps);

  return { loading, syncError };
}
