import { useEffect, useState } from "react";

export function useGameLoop(running: boolean, speed: number) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setTick((t) => t + 1), speed);
    return () => clearInterval(interval);
  }, [running, speed]);

  return tick;
}
