import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Synergy } from "../types/Synergy";
import { useSynergies } from "./useSynergies";
import type { ActivePerkRuntime } from "../components/run/RoguelikeRun";

type Params = {
  activePerks: ActivePerkRuntime[];
  setGravityMultiplier: Dispatch<SetStateAction<number>>;
  setScoreMultiplier: Dispatch<SetStateAction<number>>;
  setChaosMode: Dispatch<SetStateAction<boolean>>;
  setTimeFreezeDurationSafe: (update: number | ((prev: number) => number)) => void;
  addBomb: (count: number) => void;
  setBombRadius: Dispatch<SetStateAction<number>>;
  durationMs?: number;
};

export function useSynergyToast({
  activePerks,
  setGravityMultiplier,
  setScoreMultiplier,
  setChaosMode,
  setTimeFreezeDurationSafe,
  addBomb,
  setBombRadius,
  durationMs = 2500,
}: Params) {
  const [synergyToast, setSynergyToast] = useState<Synergy | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Applique les effets de synergie et déclenche un toast visuel à l'activation.
  useSynergies(
    activePerks.map((p) => p.id),
    {
      setGravityMultiplier,
      setScoreMultiplier,
      setChaosMode,
      setTimeFreezeDuration: setTimeFreezeDurationSafe,
      addBomb: (n) => addBomb(n),
      activePerks: activePerks.map((p) => p.id),
      setBombRadius,
    },
    (synergy) => {
      // Le toast se ferme automatiquement, en remplaçant tout toast en cours.
      setSynergyToast(synergy);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setSynergyToast(null), durationMs);
    }
  );

  useEffect(() => {
    // Nettoyage des timeouts au démontage pour éviter les fuites.
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { synergyToast };
}
