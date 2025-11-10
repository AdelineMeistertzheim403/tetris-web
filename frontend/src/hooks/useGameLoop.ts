import { useEffect, useState } from "react";

export function useGameLoop(active: boolean) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [active]);

  return tick;
}
