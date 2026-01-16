export type MutationContext = {
  // 💣 Bombes
  addBomb: (count?: number) => void;
  setBombRadius: (fn: (v: number) => number) => void;
  enableChainExplosions: () => void;

  // ⏳ Temps / Gravité
  setGravityMultiplier: (fn: (v: number) => number) => void;
  addTimeFreezeOnUse: () => void;
  enableLineSlow: () => void;

  // 🎯 Score
  setScoreMultiplier: (fn: (v: number) => number) => void;
  enableNoBombBonus: () => void;
  enableZeroBombBoost: () => void;

  // 🧠 Contrôle
  setRotationSpeed: (value: number) => void;
  enableHardDropHoldReset: () => void;

  // 🔥 Chaos
  enableChaosDrift: () => void;
  enablePieceMutation: () => void;

  // ☠️ Endgame
  enableSecondChanceRecharge: (everyLevels: number) => void;
};
