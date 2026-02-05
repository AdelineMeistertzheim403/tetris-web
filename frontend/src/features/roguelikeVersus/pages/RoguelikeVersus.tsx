import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import OpponentBoard from "../../game/components/board/OpponentBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { useRoguelikeVersusSocket } from "../hooks/useRoguelikeVersusSocket";
import { saveRoguelikeVersusMatch } from "../../game/services/scoreService";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import { applyPerk } from "../../roguelike/logic/applyPerk";
import { ALL_PERKS } from "../../roguelike/data/perks";
import { useTimeFreeze } from "../../roguelike/hooks/useTimeFreeze";
import { useTimeFreezeState } from "../../roguelike/hooks/useTimeFreezeState";
import { applyTimeFreezeDurationFromPerk } from "../../roguelike/utils/timeFreeze";
import type { ActivePerkRuntime } from "../../roguelike/components/run/RoguelikeRun";
import { RV_MUTATIONS } from "../data/mutations";
import { RV_SYNERGIES } from "../data/synergies";
import { RV_EVENTS } from "../data/events";
import type { RvEffect, RvPhase, RvRewardOption, RvMutation } from "../types";
import { createRng } from "../../../shared/utils/rng";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

const RED_ZONE_HEIGHT = 16;
const REWARD_INTERVAL_LINES = 10;
const REWARD_LABELS: Record<string, string> = {
  emp: "Bombe EMP",
  gravity: "Gravity Bomb",
  mirror: "Mirror Bomb",
  seed: "Seed Bomb",
  fog: "Fog Bomb",
  shield: "Bouclier",
  score_boost: "Boost Score",
  time_freeze: "Time Freeze",
  slow: "Ralentissement",
  invert: "Inversion",
  preview_off: "Blackout",
};

const pickWeighted = <T,>(pool: Array<{ item: T; weight: number }>, rng: () => number): T => {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return pool[0].item;
};

export default function RoguelikeVersus() {
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [manualMatchId, setManualMatchId] = useState("");
  const [chosenMatchId, setChosenMatchId] = useState<string | undefined>(undefined);
  const visitedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const runDurationRef = useRef(0);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const linesSentRef = useRef(0);
  const maxStackHeightRef = useRef(0);
  const levelRef = useRef(1);
  const finalizedRef = useRef(false);
  const rngRef = useRef<(() => number) | null>(null);

  const [localFinished, setLocalFinished] = useState(false);
  const [hasSavedResult, setHasSavedResult] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentLines, setCurrentLines] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [nextRewardAt, setNextRewardAt] = useState(REWARD_INTERVAL_LINES);
  const [phase, setPhase] = useState<RvPhase>("SETUP");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pieceLockTick, setPieceLockTick] = useState(0);
  const [rewardOptions, setRewardOptions] = useState<RvRewardOption[]>([]);
  const [selectingReward, setSelectingReward] = useState(false);
  const [rewardDeadline, setRewardDeadline] = useState<number | null>(null);
  const [rewardCountdown, setRewardCountdown] = useState(0);
  const [activePerks, setActivePerks] = useState<ActivePerkRuntime[]>([]);
  const [activeMutations, setActiveMutations] = useState<Array<{ mutation: RvMutation; stacks: number }>>(
    []
  );

  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [baseGravityMultiplier, setBaseGravityMultiplier] = useState(1);
  const [garbageMultiplier, setGarbageMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [bombsGranted, setBombsGranted] = useState(0);
  const [bombRadius, setBombRadius] = useState(1);
  const [secondChance, setSecondChance] = useState(false);
  const [fastHoldReset, setFastHoldReset] = useState(false);
  const [hardDropHoldReset, setHardDropHoldReset] = useState(false);
  const [lastStand, setLastStand] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [chaosDrift, setChaosDrift] = useState(false);
  const [pieceMutation, setPieceMutation] = useState(false);
  const [garbageShieldRatio, setGarbageShieldRatio] = useState(0);
  const [garbageShield, setGarbageShield] = useState(0);
  const [bonusDamageReduction, setBonusDamageReduction] = useState(0);
  const [synergyDamageReduction, setSynergyDamageReduction] = useState(0);
  const [mirrorCurse, setMirrorCurse] = useState(false);
  const [garbageStorm, setGarbageStorm] = useState(false);
  const [doubleGarbage, setDoubleGarbage] = useState(false);
  const [doubleVision, setDoubleVision] = useState(false);
  const [bonusScoreMultiplier, setBonusScoreMultiplier] = useState(1);
  const [effectGravityMultiplier, setEffectGravityMultiplier] = useState(1);

  const [disableHold, setDisableHold] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const [invertControls, setInvertControls] = useState(false);
  const [fogRows, setFogRows] = useState(0);
  const [forcedSequence, setForcedSequence] = useState<string[]>([]);
  const [forcedSequenceToken, setForcedSequenceToken] = useState(0);

  const [incomingGarbage, setIncomingGarbage] = useState(0);

  const {
    timeFreezeCharges,
    setTimeFreezeCharges,
    timeFrozen,
    setTimeFrozen,
    timeFreezeDuration,
    setTimeFreezeDurationSafe,
    timeFreezeEcho,
    setTimeFreezeEcho,
    resetTimeFreezeState,
  } = useTimeFreezeState();

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  const joinId = useMemo(
    () => (chosenMatchId ?? manualMatchId) || undefined,
    [manualMatchId, chosenMatchId]
  );

  const {
    connected,
    currentMatchId,
    players,
    opponentLeft,
    matchOver,
    error,
    bagSequence,
    garbage,
    actions,
    opponentBoard,
    opponentFinished,
    slot,
    results,
    playersInfo,
    opponentStatus,
    pendingEffect,
  } = useRoguelikeVersusSocket({ matchId: joinId, userId: user?.id, pseudo: user?.pseudo });

  const startReady = players >= 2 && bagSequence.length > 0;

  useEffect(() => {
    setHasSavedResult(false);
  }, [currentMatchId]);

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, ROGUELIKE_VERSUS: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES },
    });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    if (!currentMatchId) return;
    rngRef.current = createRng(`rv-${currentMatchId}`);
  }, [currentMatchId]);

  useEffect(() => {
    if (!startReady) return;
    const timer = setInterval(() => {
      if (!startTimeRef.current) return;
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);
    return () => clearInterval(timer);
  }, [startReady]);

  useEffect(() => {
    if (!startReady) return;
    if (elapsedMs < 60_000) return setPhase("SETUP");
    if (elapsedMs < 180_000) return setPhase("ESCALATION");
    setPhase("OVERLOAD");
  }, [elapsedMs, startReady]);

  useEffect(() => {
    if (!startReady) return;
    if (!rngRef.current) return;
    let cancelled = false;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const rng = rngRef.current ?? Math.random;
      const delay = 60_000 + Math.floor(rng() * 30_000);
      timeoutRef = setTimeout(() => {
        if (cancelled) return;
        const event = RV_EVENTS[Math.floor(rng() * RV_EVENTS.length)];
        const effect = event.buildEffect();
        applyEffect(effect, true);
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [startReady]);

  useEffect(() => {
    if (!pendingEffect) return;
    applyEffect(pendingEffect as RvEffect, false);
    actions.consumePendingEffect();
  }, [actions, pendingEffect]);

  const effectiveDamageReduction = Math.min(0.8, bonusDamageReduction + synergyDamageReduction);
  const dominationActive =
    activeMutations.length > (opponentStatus?.mutations ?? 0);
  const effectiveGarbageMultiplier = garbageMultiplier * (dominationActive ? 1.2 : 1);
  const effectiveGravityMultiplier = baseGravityMultiplier * effectGravityMultiplier;
  const effectiveScoreMultiplier = scoreMultiplier * bonusScoreMultiplier;

  useEffect(() => {
    if (!garbage) return;
    let incoming = garbage;
    if (doubleGarbage) incoming *= 2;
    if (effectiveDamageReduction > 0) {
      incoming = Math.max(0, Math.round(incoming * (1 - effectiveDamageReduction)));
    }
    if (garbageShield > 0) {
      const absorbed = Math.min(garbageShield, incoming);
      incoming -= absorbed;
      setGarbageShield((v) => Math.max(0, v - absorbed));
    }
    if (incoming > 0) {
      setIncomingGarbage((v) => v + incoming);
    }
    actions.consumeGarbage();
  }, [actions, doubleGarbage, effectiveDamageReduction, garbage, garbageShield]);

  useEffect(() => {
    const now = Date.now();
    setActivePerks((prev) => prev.filter((p) => !p.expiresAt || p.expiresAt > now));
  }, [elapsedMs]);

  useEffect(() => {
    if (!startReady) return;
    const status = {
      score: currentScore,
      lines: currentLines,
      mutations: activeMutations.length,
      perks: activePerks.length,
      pendingGarbage: incomingGarbage,
      stackHeight: maxStackHeightRef.current,
    };
    actions.sendStatus(status);
  }, [actions, activeMutations.length, activePerks.length, currentLines, currentScore, incomingGarbage, startReady]);

  const { triggerTimeFreeze } = useTimeFreeze({
    timeFreezeCharges,
    timeFrozen,
    timeFreezeDuration,
    timeFreezeEcho,
    setTimeFreezeCharges,
    setTimeFrozen,
    setActivePerks,
  });

  const resetRunTracking = () => {
    startTimeRef.current = null;
    runDurationRef.current = 0;
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    linesSentRef.current = 0;
    maxStackHeightRef.current = 0;
    levelRef.current = 1;
    finalizedRef.current = false;
    setTotalLines(0);
    setNextRewardAt(REWARD_INTERVAL_LINES);
    setCurrentScore(0);
    setCurrentLines(0);
    setActivePerks([]);
    setActiveMutations([]);
    setScoreMultiplier(1);
    setBonusScoreMultiplier(1);
    setBaseGravityMultiplier(1);
    setEffectGravityMultiplier(1);
    setGarbageMultiplier(1);
    setExtraHoldSlots(0);
    setBombsGranted(0);
    setBombRadius(1);
    setSecondChance(false);
    setFastHoldReset(false);
    setHardDropHoldReset(false);
    setLastStand(false);
    setChaosMode(false);
    setChaosDrift(false);
    setPieceMutation(false);
    setGarbageShieldRatio(0);
    setGarbageShield(0);
    setBonusDamageReduction(0);
    setSynergyDamageReduction(0);
    setMirrorCurse(false);
    setGarbageStorm(false);
    setDoubleGarbage(false);
    setDoubleVision(false);
    setDisableHold(false);
    setHidePreview(false);
    setInvertControls(false);
    setFogRows(0);
    setForcedSequence([]);
    setForcedSequenceToken((v) => v + 1);
    setIncomingGarbage(0);
    resetTimeFreezeState();
    setTimeFreezeEcho(false);
  };

  const applyEffect = (effect: RvEffect, isGlobal: boolean) => {
    const clearLater = (cb: () => void, duration: number) => {
      if (duration <= 0) return;
      setTimeout(cb, duration);
    };

    if (
      !isGlobal &&
      mirrorCurse &&
      !effect.mirrorCopy &&
      ["emp", "gravity", "mirror", "fog", "seed"].includes(effect.type)
    ) {
      const rng = rngRef.current ?? Math.random;
      if (rng() < 0.5) {
        actions.sendEffect({ ...effect, mirrorCopy: true });
      }
    }

    if (effect.type === "emp" || effect.type === "blackout") {
      setDisableHold(true);
      setHidePreview(true);
      clearLater(() => {
        setDisableHold(false);
        setHidePreview(false);
      }, effect.durationMs);
      return;
    }

    if (effect.type === "gravity") {
      setEffectGravityMultiplier(effect.multiplier);
      clearLater(() => setEffectGravityMultiplier(1), effect.durationMs);
      return;
    }

    if (effect.type === "mirror") {
      setInvertControls(true);
      clearLater(() => setInvertControls(false), effect.durationMs);
      return;
    }

    if (effect.type === "seed") {
      const sequence = Array.from({ length: effect.count }, () => effect.piece);
      setForcedSequence(sequence);
      setForcedSequenceToken((v) => v + 1);
      clearLater(() => {
        setForcedSequence([]);
        setForcedSequenceToken((v) => v + 1);
      }, effect.durationMs);
      return;
    }

    if (effect.type === "fog") {
      setFogRows(effect.rows);
      clearLater(() => setFogRows(0), effect.durationMs);
      return;
    }

    if (effect.type === "time_rift") {
      const myScore = currentScore;
      const oppScore = opponentStatus?.score ?? myScore;
      if (myScore < oppScore) {
        setEffectGravityMultiplier(effect.slowMultiplier);
        clearLater(() => setEffectGravityMultiplier(1), effect.durationMs);
      }
      return;
    }

    if (effect.type === "garbage_storm") {
      setGarbageStorm(true);
      clearLater(() => setGarbageStorm(false), effect.durationMs);
      return;
    }

    if (effect.type === "double_garbage") {
      setDoubleGarbage(true);
      clearLater(() => setDoubleGarbage(false), effect.durationMs);
      return;
    }

    if (effect.type === "double_vision") {
      setDoubleVision(true);
      clearLater(() => setDoubleVision(false), effect.durationMs);
      return;
    }

    if (effect.type === "bonus" && effect.id === "mutation_surge") {
      forceMutationChoice();
      return;
    }

    if (isGlobal && effect.type === "bonus") return;
  };

  const forceMutationChoice = () => {
    const rng = rngRef.current ?? Math.random;
    const mutation = RV_MUTATIONS[Math.floor(rng() * RV_MUTATIONS.length)];
    applyMutation(mutation);
  };

  const applyMutation = (mutation: RvMutation) => {
    const existing = activeMutations.find((m) => m.mutation.id === mutation.id);
    if (existing && mutation.unique) return;
    if (existing && mutation.stackable && mutation.maxStacks && existing.stacks >= mutation.maxStacks) return;

    mutation.apply({
      setGarbageMultiplier,
      setGravityMultiplier: (fn) => setBaseGravityMultiplier((v) => fn(v)),
      setGarbageShieldRatio,
      enableInstable: () => setInstable(true),
    });

    setActiveMutations((prev) => {
      const current = prev.find((m) => m.mutation.id === mutation.id);
      if (!current) return [...prev, { mutation, stacks: 1 }];
      const nextStacks = mutation.stackable
        ? Math.min(current.stacks + 1, mutation.maxStacks ?? current.stacks + 1)
        : current.stacks;
      return prev.map((m) => (m.mutation.id === mutation.id ? { ...m, stacks: nextStacks } : m));
    });
  };

  const [instable, setInstable] = useState(false);
  useEffect(() => {
    if (!instable) return;
    const interval = setInterval(() => {
      const rng = rngRef.current ?? Math.random;
      const roll = rng();
      if (roll < 0.33) {
        setBonusScoreMultiplier(1.3);
        setTimeout(() => setBonusScoreMultiplier(1), 6000);
      } else if (roll < 0.66) {
        setEffectGravityMultiplier(1.3);
        setTimeout(() => setEffectGravityMultiplier(1), 6000);
      } else {
        setDisableHold(true);
        setTimeout(() => setDisableHold(false), 6000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [instable]);

  useEffect(() => {
    if (!doubleVision) return;
    if (pieceLockTick === 0) return;
    const rng = rngRef.current ?? Math.random;
    const pieces = ["I", "O", "T", "S", "Z", "L", "J"];
    const sequence = [
      pieces[Math.floor(rng() * pieces.length)],
      pieces[Math.floor(rng() * pieces.length)],
    ];
    setForcedSequence(sequence);
    setForcedSequenceToken((v) => v + 1);
  }, [doubleVision, pieceLockTick]);

  const getActiveSynergies = () => {
    const ctx = {
      myMutations: activeMutations.length,
      oppMutations: opponentStatus?.mutations ?? 0,
      myGarbage: incomingGarbage,
      oppGarbage: opponentStatus?.pendingGarbage ?? 0,
    };
    return RV_SYNERGIES.filter((s) => s.isActive(ctx));
  };

  useEffect(() => {
    const active = getActiveSynergies();
    setSynergyDamageReduction(0);
    setMirrorCurse(false);
    active.forEach((synergy) => {
      if (synergy.id === "last-stand") setSynergyDamageReduction(0.35);
      if (synergy.id === "mirror-chaos") setMirrorCurse(true);
    });
  }, [activeMutations.length, incomingGarbage, opponentStatus?.mutations, opponentStatus?.pendingGarbage]);

  const buildRewardOptions = () => {
    const rng = rngRef.current ?? Math.random;
    const isBehind = (opponentStatus?.score ?? 0) > currentScore;
    const highStack = maxStackHeightRef.current >= 12;

    const categories = [
      { kind: "perk" as const, weight: isBehind ? 1 : 2 },
      { kind: "mutation" as const, weight: isBehind ? 1 : 2 },
      { kind: "bomb" as const, weight: 2 },
      { kind: "bonus" as const, weight: isBehind || highStack ? 3 : 1.5 },
      { kind: "debuff" as const, weight: isBehind ? 3 : 1 },
    ];

    const options: RvRewardOption[] = [];
    const used = new Set<string>();
    while (options.length < 3) {
      const kind = pickWeighted(categories.map((c) => ({ item: c.kind, weight: c.weight })), rng);
      if (kind === "perk") {
        const pool = ALL_PERKS.filter((p) => !activePerks.some((ap) => ap.id === p.id));
        if (!pool.length) continue;
        const perk = pool[Math.floor(rng() * pool.length)];
        if (!perk || used.has(perk.id)) continue;
        used.add(perk.id);
        options.push({
          kind: "perk",
          id: perk.id,
          title: perk.name,
          description: perk.description,
        });
      } else if (kind === "mutation") {
        const pool = RV_MUTATIONS.filter(
          (m) => !activeMutations.some((am) => am.mutation.id === m.id && m.unique)
        );
        if (!pool.length) continue;
        const mutation = pool[Math.floor(rng() * pool.length)];
        if (!mutation || used.has(mutation.id)) continue;
        used.add(mutation.id);
        options.push({
          kind: "mutation",
          id: mutation.id,
          title: mutation.name,
          description: mutation.description,
        });
      } else if (kind === "bomb") {
        const bombs: RvRewardOption[] = [
          { kind: "bomb", id: "emp" },
          { kind: "bomb", id: "gravity" },
          { kind: "bomb", id: "mirror" },
          { kind: "bomb", id: "seed" },
          { kind: "bomb", id: "fog" },
        ];
        const pick = bombs[Math.floor(rng() * bombs.length)];
        if (used.has(`${pick.kind}-${pick.id}`)) continue;
        used.add(`${pick.kind}-${pick.id}`);
        options.push(pick);
      } else if (kind === "bonus") {
        const bonuses: RvRewardOption[] = [
          { kind: "bonus", id: "shield" },
          { kind: "bonus", id: "score_boost" },
          { kind: "bonus", id: "time_freeze" },
        ];
        const pick = bonuses[Math.floor(rng() * bonuses.length)];
        if (used.has(`${pick.kind}-${pick.id}`)) continue;
        used.add(`${pick.kind}-${pick.id}`);
        options.push(pick);
      } else {
        const debuffs: RvRewardOption[] = [
          { kind: "debuff", id: "slow" },
          { kind: "debuff", id: "invert" },
          { kind: "debuff", id: "preview_off" },
        ];
        const pick = debuffs[Math.floor(rng() * debuffs.length)];
        if (used.has(`${pick.kind}-${pick.id}`)) continue;
        used.add(`${pick.kind}-${pick.id}`);
        options.push(pick);
      }
    }
    return options;
  };

  const handleRewardSelect = (option: RvRewardOption) => {
    setSelectingReward(false);
    setRewardOptions([]);
    setRewardDeadline(null);

    if (option.kind === "perk") {
      const perk = ALL_PERKS.find((p) => p.id === option.id);
      if (!perk) return;
      const isTimeFreeze = perk.id === "time-freeze";

      applyPerk(perk, {
        addHoldSlot: () => setExtraHoldSlots((v) => v + 1),
        slowGravity: (factor = 1.2) => setBaseGravityMultiplier((v) => v * factor),
        addBomb: (count = 1) => setBombsGranted((v) => v + count),
        addScoreBoost: (value = 0.3) => setScoreMultiplier((v) => v + value),
        grantSecondChance: () => setSecondChance(true),
        addTimeFreeze: (count = 1) => setTimeFreezeCharges((v) => v + count),
        enableChaosMode: () => setChaosMode(true),
        setBombRadius: (radius: number) => setBombRadius(radius),
        enableFastHoldReset: () => setFastHoldReset(true),
        enableLastStand: () => setLastStand(true),
      });

      if (isTimeFreeze) {
        applyTimeFreezeDurationFromPerk(perk, setTimeFreezeDurationSafe);
      }

      setActivePerks((prev) => [
        ...prev,
        {
          ...perk,
          startedAt: isTimeFreeze ? undefined : Date.now(),
          expiresAt: !isTimeFreeze && perk.durationMs ? Date.now() + perk.durationMs : undefined,
          pending: isTimeFreeze,
        },
      ]);
      return;
    }

    if (option.kind === "mutation") {
      const mutation = RV_MUTATIONS.find((m) => m.id === option.id);
      if (!mutation) return;
      applyMutation(mutation);
      return;
    }

    if (option.kind === "bomb") {
      const rng = rngRef.current ?? Math.random;
      const piece = ["I", "O", "T", "S", "Z", "L", "J"][Math.floor(rng() * 7)];
      if (option.id === "emp") actions.sendEffect({ type: "emp", durationMs: 5000 });
      if (option.id === "gravity")
        actions.sendEffect({ type: "gravity", durationMs: 6000, multiplier: 2 });
      if (option.id === "mirror") actions.sendEffect({ type: "mirror", durationMs: 3000 });
      if (option.id === "seed")
        actions.sendEffect({ type: "seed", durationMs: 6000, piece, count: 5 });
      if (option.id === "fog") actions.sendEffect({ type: "fog", durationMs: 6000, rows: 3 });
      return;
    }

    if (option.kind === "bonus") {
      if (option.id === "shield") {
        setBonusDamageReduction(0.4);
        setTimeout(() => setBonusDamageReduction(0), 10000);
      }
      if (option.id === "score_boost") {
        setBonusScoreMultiplier(1.3);
        setTimeout(() => setBonusScoreMultiplier(1), 15000);
      }
      if (option.id === "time_freeze") {
        setTimeFreezeCharges((v) => v + 1);
      }
      return;
    }

    if (option.kind === "debuff") {
      if (option.id === "slow") actions.sendEffect({ type: "gravity", durationMs: 8000, multiplier: 1.3 });
      if (option.id === "invert") actions.sendEffect({ type: "mirror", durationMs: 4000 });
      if (option.id === "preview_off") actions.sendEffect({ type: "emp", durationMs: 6000 });
    }
  };

  const maybeTriggerReward = (nextTotalLines: number) => {
    if (selectingReward) return;
    if (nextTotalLines < nextRewardAt) return;
    setRewardOptions(buildRewardOptions());
    setSelectingReward(true);
    setRewardDeadline(Date.now() + 10_000);
    setNextRewardAt((v) => v + REWARD_INTERVAL_LINES);
  };

  useEffect(() => {
    if (!selectingReward || !rewardDeadline) {
      setRewardCountdown(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, rewardDeadline - Date.now());
      setRewardCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setRewardDeadline(null);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [selectingReward, rewardDeadline]);

  useEffect(() => {
    if (!selectingReward) return;
    if (rewardDeadline !== null) return;
    if (!rewardOptions.length) return;
    const rng = rngRef.current ?? Math.random;
    const pick = rewardOptions[Math.floor(rng() * rewardOptions.length)];
    handleRewardSelect(pick);
  }, [selectingReward, rewardDeadline, rewardOptions]);

  useEffect(() => {
    if (!matchOver || !results || slot === null || !user || hasSavedResult) return;
    if (slot !== 1) return;
    if (results.length < 2) return;

    const payload = {
      matchId: currentMatchId ?? undefined,
      players: results.map((r) => {
        const meta = playersInfo.find((p) => p.slot === r.slot);
        const isSelf = r.slot === slot;
        return {
          slot: r.slot,
          userId: meta?.userId ?? (isSelf ? user.id : undefined),
          pseudo: meta?.pseudo ?? (isSelf ? user.pseudo : "Adversaire"),
          score: r.score,
          lines: r.lines,
        };
      }),
    };

    saveRoguelikeVersusMatch(payload).catch((err) =>
      console.error("Erreur enregistrement match roguelike versus :", err)
    );
    setHasSavedResult(true);
  }, [currentMatchId, hasSavedResult, matchOver, playersInfo, results, slot, user]);

  useEffect(() => {
    if (!matchOver || !results || slot === null) return;
    if (finalizedRef.current) return;
    const myResult = results.find((r) => r.slot === slot) ?? null;
    const oppResult = results.find((r) => r.slot !== slot) ?? null;
    if (!myResult || !oppResult) return;

    const win = myResult.score > oppResult.score;
    const perfectWin = win && maxStackHeightRef.current < RED_ZONE_HEIGHT;
    const durationMs = runDurationRef.current;
    const noHold = holdCountRef.current === 0;
    const noHardDrop = hardDropCountRef.current === 0;
    const level = levelRef.current;
    let sameScoreTwice = false;

    const next = updateStats((prev) => {
      sameScoreTwice = prev.lastScore !== null && prev.lastScore === myResult.score;
      return {
        ...prev,
        roguelikeVersusMatches: prev.roguelikeVersusMatches + 1,
        roguelikeVersusWins: prev.roguelikeVersusWins + (win ? 1 : 0),
        roguelikeVersusWinStreak: win ? prev.roguelikeVersusWinStreak + 1 : 0,
        roguelikeVersusLinesSent: prev.roguelikeVersusLinesSent + linesSentRef.current,
        scoredModes: {
          ...prev.scoredModes,
          ROGUELIKE_VERSUS: myResult.score > 0 ? true : prev.scoredModes.ROGUELIKE_VERSUS,
        },
        level10Modes: {
          ...prev.level10Modes,
          ROGUELIKE_VERSUS: level >= 10 ? true : prev.level10Modes.ROGUELIKE_VERSUS,
        },
        playtimeMs: prev.playtimeMs + durationMs,
        noHoldRuns: prev.noHoldRuns + (noHold ? 1 : 0),
        hardDropCount: prev.hardDropCount + hardDropCountRef.current,
        lastScore: myResult.score,
      };
    });

    checkAchievements({
      mode: "ROGUELIKE_VERSUS",
      score: myResult.score,
      lines: myResult.lines,
      level,
      tetrisCleared: tetrisCountRef.current > 0,
      custom: {
        rv_match_1: next.roguelikeVersusMatches >= 1,
        rv_match_10: next.roguelikeVersusMatches >= 10,
        rv_match_50: next.roguelikeVersusMatches >= 50,
        rv_win_1: next.roguelikeVersusWins >= 1,
        rv_win_streak_5: next.roguelikeVersusWinStreak >= 5,
        rv_perfect_win: perfectWin,
        rv_lines_sent_30: next.roguelikeVersusLinesSent >= 30,
        combo_5: maxComboRef.current >= 5,
        no_hold_runs_10: next.noHoldRuns >= 10,
        harddrop_50: next.hardDropCount >= 50,
        no_harddrop_10_min: durationMs >= 10 * 60 * 1000 && noHardDrop,
        playtime_60m: next.playtimeMs >= 60 * 60 * 1000,
        playtime_300m: next.playtimeMs >= 300 * 60 * 1000,
        level_10_three_modes: countTrue(next.level10Modes) >= 3,
        scored_all_modes: countTrue(next.scoredModes) >= TOTAL_SCORED_MODES,
        modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES,
        same_score_twice: sameScoreTwice,
      },
    });

    finalizedRef.current = true;
  }, [matchOver, results, slot, updateStats, checkAchievements]);

  if (startReady) {
    const myResult = results?.find((r) => r.slot === slot) ?? null;
    const oppResult = results?.find((r) => r.slot !== slot) ?? null;

    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative">
        <h1 className="text-3xl text-yellow-400 mb-4 drop-shadow-[0_0_15px_#ff00ff]">
          Roguelike Versus
        </h1>
        <p className="text-sm text-cyan-200 mb-4">
          {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
        </p>
        <div className="flex gap-6 items-start">
          <TetrisBoard
            mode="ROGUELIKE_VERSUS"
            scoreMode={null}
            bagSequence={bagSequence}
            incomingGarbage={incomingGarbage}
            onGarbageConsumed={() => setIncomingGarbage(0)}
            onConsumeLines={(lines) => {
              let effective = lines;
              if (phase === "SETUP") effective = Math.round(lines * 0.6);
              if (phase === "OVERLOAD") effective = Math.round(lines * 1.4);
              effective = Math.round(effective * effectiveGarbageMultiplier);
              if (doubleGarbage) effective = Math.round(effective * 2);
              if (garbageShieldRatio > 0 && effective > 0) {
                const shieldGain = Math.max(1, Math.round(effective * garbageShieldRatio));
                setGarbageShield((v) => v + shieldGain);
              }
              if (effective > 0) {
                linesSentRef.current += effective;
                actions.sendLinesCleared(effective);
                if (garbageStorm) {
                  setIncomingGarbage((v) => v + Math.max(1, Math.round(effective * 0.5)));
                }
              }
            }}
            onLinesCleared={(linesCleared) => {
              if (linesCleared > 0) {
                comboStreakRef.current += linesCleared;
                if (comboStreakRef.current > maxComboRef.current) {
                  maxComboRef.current = comboStreakRef.current;
                }
              } else {
                comboStreakRef.current = 0;
              }
              if (linesCleared === 4) {
                tetrisCountRef.current += 1;
              }
              setCurrentLines((v) => v + linesCleared);
              setTotalLines((prev) => {
                const nextTotal = prev + linesCleared;
                maybeTriggerReward(nextTotal);
                return nextTotal;
              });
            }}
            onPieceLocked={() => setPieceLockTick((v) => v + 1)}
            onBoardUpdate={(board) => {
              const rows = board.length;
              let topFilled = rows;
              for (let y = 0; y < rows; y += 1) {
                if (board[y].some((cell) => cell !== 0)) {
                  topFilled = y;
                  break;
                }
              }
              const height = rows - topFilled;
              if (height > maxStackHeightRef.current) {
                maxStackHeightRef.current = height;
              }
              actions.sendBoardState(board);
            }}
            onLocalGameOver={(score, lines) => {
              setLocalFinished(true);
              if (startTimeRef.current) {
                runDurationRef.current = Date.now() - startTimeRef.current;
              }
              actions.sendGameOver(score, lines);
            }}
            hideGameOverOverlay
            onGameStart={() => {
              resetRunTracking();
              startTimeRef.current = Date.now();
            }}
            onHold={() => {
              holdCountRef.current += 1;
            }}
            onHardDrop={() => {
              hardDropCountRef.current += 1;
            }}
            onLevelChange={(level) => {
              levelRef.current = level;
            }}
            onScoreChange={(score) => setCurrentScore(Math.round(score))}
            gravityMultiplier={effectiveGravityMultiplier}
            scoreMultiplier={effectiveScoreMultiplier}
            extraHold={extraHoldSlots}
            bombsGranted={bombsGranted}
            bombRadius={bombRadius}
            secondChance={secondChance}
            fastHoldReset={fastHoldReset}
            hardDropHoldReset={hardDropHoldReset}
            lastStand={lastStand}
            chaosMode={chaosMode}
            chaosDrift={chaosDrift}
            pieceMutation={pieceMutation}
            disableHold={disableHold}
            hidePreview={hidePreview}
            invertControls={invertControls}
            fogRows={fogRows}
            forcedSequence={forcedSequence}
            forcedSequenceToken={forcedSequenceToken}
            timeFrozen={timeFrozen}
            onTriggerTimeFreeze={triggerTimeFreeze}
            timeFreezeCharges={timeFreezeCharges}
          />
          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-gray-300 mb-2">Grille adverse</p>
            <OpponentBoard board={opponentBoard} />
            {opponentLeft && <p className="text-yellow-300">Adversaire parti</p>}
            {opponentFinished && !matchOver && (
              <p className="text-green-300">Adversaire a terminé</p>
            )}
            {selectingReward && rewardOptions.length > 0 && (
              <div className="mt-4 w-full max-w-[240px] text-left bg-black/70 border border-pink-500/60 rounded-lg p-3">
                <p className="text-xs text-yellow-300 mb-2">
                  Choisis une récompense ({rewardCountdown}s)
                </p>
                <div className="flex flex-col gap-2">
                  {rewardOptions.map((opt, idx) => (
                    <button
                      key={`${opt.kind}-${opt.id}-${idx}`}
                      className="retro-btn text-xs w-full"
                      onClick={() => handleRewardSelect(opt)}
                    >
                      {opt.title ?? REWARD_LABELS[opt.id] ?? opt.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 mt-2">{error}</p>}

        <FullScreenOverlay show={!matchOver && localFinished && !opponentFinished}>
          <div className="flex flex-col gap-3 items-center text-white text-lg font-bold">
            <p>En attente de l’adversaire...</p>
          </div>
        </FullScreenOverlay>

        <FullScreenOverlay show={matchOver && !!results}>
          <div
            style={{
              background: "rgba(0,0,0,0.85)",
              border: "2px solid #ff00ff",
              borderRadius: "12px",
              padding: "24px 28px",
              minWidth: "320px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
              color: "white",
              textAlign: "center",
              boxShadow: "0 0 20px #ff00ff",
            }}
          >
            <h2 className="text-xl text-yellow-300">Résultats</h2>
            <p>
              Toi : {myResult ? `${myResult.score} pts / ${myResult.lines} lignes` : "n/a"}
            </p>
            <p>
              Adversaire :{" "}
              {oppResult ? `${oppResult.score} pts / ${oppResult.lines} lignes` : "n/a"}
            </p>
            <div className="flex gap-4 mt-2">
              <button
                className="retro-btn"
                onClick={() => {
                  setLocalFinished(false);
                  setChosenMatchId(undefined);
                  setManualMatchId("");
                  actions.leaveMatch();
                }}
              >
                Retour lobby
              </button>
            </div>
          </div>
        </FullScreenOverlay>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-10">
      <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">
        Mode Roguelike Versus (beta)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-[90%]" style={{ maxWidth: "820px" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 0 18px #ff00ff",
          }}
        >
          <p className="text-sm text-cyan-200 text-left">
            {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
          </p>

          <div className="text-left flex flex-col gap-3 mt-3">
            <label className="text-xs text-yellow-300 uppercase tracking-wide">Créer / Rejoindre</label>
            <div className="flex items-center w-full">
              <input
                value={manualMatchId}
                onChange={(e) => setManualMatchId(e.target.value)}
                placeholder="ID de partie (vide pour créer)"
                className="retro-input flex-1 min-w-[0px]"
              />
              <button
                className="retro-btn whitespace-nowrap flex-shrink-0 ml-20"
                onClick={() => {
                  if (!manualMatchId) {
                    setChosenMatchId(randomMatchId());
                  } else {
                    setChosenMatchId(manualMatchId);
                  }
                  actions.resetState();
                }}
              >
                Go
              </button>
            </div>
            <p className="text-xs text-gray-300">
              Laisse vide pour créer un nouvel ID, ou saisis l’ID de ton ami.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left text-sm bg-pink-900/20 p-3 rounded-md border border-pink-500/50 mt-4">
            <div>
              <p className="text-gray-300">Statut WS</p>
              <p className={connected ? "text-green-300" : "text-red-400"}>
                {connected ? "connecté" : "déconnecté"}
              </p>
            </div>
            <div>
              <p className="text-gray-300">Joueurs</p>
              <p className="text-white">{players}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-300">ID partie</p>
              <p className="text-white">{currentMatchId ?? "en attente"}</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 0 18px #ff00ff",
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-left text-yellow-300 text-xs uppercase tracking-wide">Comment jouer</p>
          <ul className="text-left text-sm text-gray-200 space-y-2">
            <li>Récompense toutes les 10 lignes, choix pondéré selon la situation.</li>
            <li>Perks, mutations et bombes tactiques créent des matchs uniques.</li>
            <li>Événements globaux toutes les 60–90 secondes.</li>
            <li>Le skill reste dominant : même sac de pièces pour tous.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
