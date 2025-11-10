import { useEffect, useState } from "react";

export function useGameLoop() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, []);

  return tick; // valeur qui s'incrémente à chaque tick du jeu
}
