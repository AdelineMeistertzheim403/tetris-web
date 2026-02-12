export type RvPhase = "SETUP" | "ESCALATION" | "OVERLOAD";

export type RvEffect = { mirrorCopy?: boolean } & (
  | { type: "emp"; durationMs: number }
  | { type: "gravity"; durationMs: number; multiplier: number }
  | { type: "mirror"; durationMs: number }
  | { type: "seed"; durationMs: number; piece: string; count: number }
  | { type: "fog"; durationMs: number; rows: number }
  | { type: "blackout"; durationMs: number }
  | { type: "time_rift"; durationMs: number; slowMultiplier: number }
  | { type: "garbage_storm"; durationMs: number }
  | { type: "double_garbage"; durationMs: number }
  | { type: "double_vision"; durationMs: number }
  | { type: "bomb_blast"; cells: Array<{ x: number; y: number }> }
  | { type: "storm_tick"; count: number }
  | { type: "steal_lines"; count: number; score: number }
  | { type: "bonus"; durationMs: number; id: string }
  | { type: "debuff"; durationMs: number; id: string }
);

export type RewardKind = "perk" | "mutation" | "bomb" | "bonus" | "debuff";

export type RvRewardOption =
  | { kind: "perk"; id: string; title?: string; description?: string }
  | { kind: "mutation"; id: string; title?: string; description?: string }
  | { kind: "bomb"; id: "emp" | "gravity" | "mirror" | "seed" | "fog"; title?: string; description?: string }
  | { kind: "bonus"; id: "shield" | "score_boost" | "time_freeze"; title?: string; description?: string }
  | { kind: "debuff"; id: "slow" | "invert" | "preview_off"; title?: string; description?: string };

export type RvMutationContext = {
  setGravityMultiplier: (fn: (v: number) => number) => void;
  setScoreMultiplier: (fn: (v: number) => number) => void;
  enableInstable: () => void;
};

export type RvMutation = {
  id: string;
  name: string;
  description: string;
  unique?: boolean;
  stackable?: boolean;
  maxStacks?: number;
  icon: string;
  apply: (ctx: RvMutationContext) => void;
};

export type RvSynergy = {
  id: string;
  name: string;
  description: string;
  isActive: (ctx: {
    myMutations: number;
    oppMutations: number;
    myGarbage: number;
    oppGarbage: number;
  }) => boolean;
  apply: (ctx: {
    setGarbageMultiplier: (fn: (v: number) => number) => void;
    enableMirrorCurse: () => void;
    setDamageReduction: (value: number) => void;
  }) => void;
};

export type RvPerk = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity?: "common" | "rare" | "epic";
  apply: (ctx: {
    addHoldSlot: () => void;
    addTimeFreeze: (count?: number) => void;
    addScoreBoost: (value?: number) => void;
    sendTacticalBomb: () => void;
  }) => void;
};
