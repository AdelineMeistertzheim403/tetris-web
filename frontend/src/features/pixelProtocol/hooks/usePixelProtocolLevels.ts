import { useEffect, useState } from "react";
import { LEVELS as DEFAULT_LEVELS } from "../levels";
import type { LevelDef } from "../types";
import { fetchPixelProtocolLevels } from "../services/pixelProtocolService";
import { listPixelProtocolWorldTemplates } from "../utils/worldTemplates";
import { resolveLevelsWorldTemplates } from "../utils/resolveWorldTemplate";

export function usePixelProtocolLevels() {
  const [levels, setLevels] = useState<LevelDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const remote = await fetchPixelProtocolLevels();
        if (active) {
          setLevels(resolveLevelsWorldTemplates(remote, listPixelProtocolWorldTemplates()));
          setUsingFallback(false);
        }
        if (active) setError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Erreur chargement niveaux Pixel Protocol";
        setError(message);
        setUsingFallback(true);
        setLevels(resolveLevelsWorldTemplates(DEFAULT_LEVELS, listPixelProtocolWorldTemplates()));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { levels, loading, error, usingFallback };
}
