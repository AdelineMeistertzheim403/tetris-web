import { useCallback, useEffect, useRef } from "react";
import type { ActivePerkRuntime } from "../components/run/RoguelikeRun";

type Params = {
  timeFreezeCharges: number;
  timeFrozen: boolean;
  timeFreezeDuration: number;
  timeFreezeEcho: boolean;
  setTimeFreezeCharges: React.Dispatch<React.SetStateAction<number>>;
  setTimeFrozen: React.Dispatch<React.SetStateAction<boolean>>;
  setActivePerks: React.Dispatch<React.SetStateAction<ActivePerkRuntime[]>>;
};

export function useTimeFreeze({
  timeFreezeCharges,
  timeFrozen,
  timeFreezeDuration,
  timeFreezeEcho,
  setTimeFreezeCharges,
  setTimeFrozen,
  setActivePerks,
}: Params) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTimeFreeze = useCallback(() => {
    if (timeFreezeCharges <= 0 || timeFrozen) return;

    setTimeFreezeCharges((v) => v - 1 + (timeFreezeEcho ? 1 : 0));
    setTimeFrozen(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const now = Date.now();
    const expiresAt = now + timeFreezeDuration;

    setActivePerks((prev) =>
      prev.map((p) =>
        p.id === "time-freeze" ? { ...p, startedAt: now, expiresAt, pending: false } : p
      )
    );

    timeoutRef.current = setTimeout(() => {
      setTimeFrozen(false);
    }, timeFreezeDuration);
  }, [
    timeFreezeCharges,
    timeFrozen,
    timeFreezeDuration,
    timeFreezeEcho,
    setTimeFreezeCharges,
    setTimeFrozen,
    setActivePerks,
  ]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { triggerTimeFreeze };
}
