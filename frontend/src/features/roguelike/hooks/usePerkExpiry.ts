import { useEffect } from "react";
import type { ActivePerkRuntime } from "../components/run/RoguelikeRun";

type Params = {
  selectingPerk: boolean;
  setActivePerks: React.Dispatch<React.SetStateAction<ActivePerkRuntime[]>>;
};

export function usePerkExpiry({ selectingPerk, setActivePerks }: Params) {
  useEffect(() => {
    if (selectingPerk) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setActivePerks((prev) => prev.filter((p) => !p.expiresAt || p.expiresAt > now));
    }, 250);

    return () => clearInterval(interval);
  }, [selectingPerk, setActivePerks]);
}
