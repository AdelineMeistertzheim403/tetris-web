import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import OpponentBoard from "../../game/components/board/OpponentBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { useRoguelikeVersusSocket } from "../hooks/useRoguelikeVersusSocket";
import { saveRoguelikeVersusMatch } from "../../game/services/scoreService";
import {
  getTetrobotsProfile,
  updateTetrobotsProfile,
  type PlayerProfile,
} from "../../game/services/scoreService";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import { useTimeFreeze } from "../../roguelike/hooks/useTimeFreeze";
import { useTimeFreezeState } from "../../roguelike/hooks/useTimeFreezeState";
import { RV_MUTATIONS } from "../data/mutations";
import { RV_SYNERGIES } from "../data/synergies";
import { RV_EVENTS } from "../data/events";
import { RV_PERKS } from "../data/perks";
import type { RvEffect, RvRewardOption, RvMutation } from "../types";
import { createRng } from "../../../shared/utils/rng";
import {
  TETROBOTS_PERSONALITIES,
  getTetrobotsPersonality,
  type BotStrategy,
  type TetrobotsPersonality,
} from "../../game/ai/tetrobots";
import {
  getBotBubbleAccent,
  getBotMessage,
  getMemoryDialogue,
  getMoodFromEvent,
  getScoreTrollDialogue,
  type BotEvent,
  type BotMood,
  type PlayerStyle,
} from "../../game/ai/tetrobotsChat";
import {
  TETROBOTS_ADAPTIVE_THRESHOLDS,
  TETROBOTS_MEMORY_TIMING,
  countBoardHoles,
  getLeftBias,
} from "../../game/ai/tetrobotsMemory";
import { TetrobotsAvatar } from "../../versus/components/TetrobotsAvatar";
import { BotSpeechBubble } from "../../versus/components/BotSpeechBubble";
import "../../../styles/tetrobots-avatar.css";
import "../../../styles/roguelike-perks.css";
import { useKeyboardControls } from "../../game/hooks/useKeyboardControls";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

const RED_ZONE_HEIGHT = 16;
const REWARD_INTERVAL_LINES = 10;
const VERSUS_GARBAGE_MAP = [0, 0, 1, 2, 4];
const MEMORY_TIMING = TETROBOTS_MEMORY_TIMING.ROGUELIKE_VERSUS;
const ADAPTIVE = TETROBOTS_ADAPTIVE_THRESHOLDS.ROGUELIKE_VERSUS;
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
type EndResult = { score: number; lines: number };
const EVENT_LABELS: Record<string, string> = {
  emp: "EMP",
  blackout: "Blackout",
  gravity: "Gravity Surge",
  mirror: "Mirror",
  seed: "Seed Bomb",
  fog: "Fog Bomb",
  time_rift: "Time Rift",
  garbage_storm: "Garbage Storm",
  double_garbage: "Double Garbage",
  double_vision: "Double Vision",
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

const getStackHeight = (board: number[][]): number => {
  const rows = board.length;
  let topFilled = rows;
  for (let y = 0; y < rows; y += 1) {
    if (board[y].some((cell) => cell !== 0)) {
      topFilled = y;
      break;
    }
  }
  return rows - topFilled;
};

const perkRarityWeight = (rarity: "common" | "rare" | "epic" = "common") => {
  if (rarity === "epic") return 0.7;
  if (rarity === "rare") return 1.4;
  return 2.6;
};

const computeBombBlast = (board: number[][] | null, rng: () => number) => {
  if (!board || board.length === 0 || board[0].length === 0) {
    return { edits: [] as Array<{ x: number; y: number }>, destroyedBlocks: 0 };
  }
  const rows = board.length;
  const cols = board[0].length;
  const filledCells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (board[y][x] !== 0) filledCells.push({ x, y });
    }
  }

  const anchor =
    filledCells.length > 0
      ? filledCells[Math.floor(rng() * filledCells.length)]
      : { x: Math.floor(rng() * cols), y: Math.floor(rng() * rows) };

  const edits: Array<{ x: number; y: number }> = [];
  let destroyedBlocks = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const tx = anchor.x + dx;
      const ty = anchor.y + dy;
      if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) continue;
      if (board[ty][tx] !== 0) destroyedBlocks += 1;
      edits.push({ x: tx, y: ty });
    }
  }
  return { edits, destroyedBlocks };
};

function RoguelikeVersusPvp() {
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
  const [pieceLockTick, setPieceLockTick] = useState(0);
  const [initialRewardGiven, setInitialRewardGiven] = useState(false);
  const [stolenBonusScore, setStolenBonusScore] = useState(0);
  const [stolenBonusLines, setStolenBonusLines] = useState(0);
  const [stolenPenaltyScore, setStolenPenaltyScore] = useState(0);
  const [stolenPenaltyLines, setStolenPenaltyLines] = useState(0);
  const [lineThiefActive, setLineThiefActive] = useState(false);
  const [activeEvent, setActiveEvent] = useState<{ name: string; endsAt: number } | null>(null);
  const [activeEventCountdown, setActiveEventCountdown] = useState(0);
  const [rewardOptions, setRewardOptions] = useState<RvRewardOption[]>([]);
  const [selectingReward, setSelectingReward] = useState(false);
  const [rewardDeadline, setRewardDeadline] = useState<number | null>(null);
  const [rewardCountdown, setRewardCountdown] = useState(0);
  const [activePerks, setActivePerks] = useState<
    Array<{ id: string; name: string; description: string; icon: string; rarity?: string }>
  >([]);
  const [activeMutations, setActiveMutations] = useState<Array<{ mutation: RvMutation; stacks: number }>>(
    []
  );

  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [baseGravityMultiplier, setBaseGravityMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [bombRadius, setBombRadius] = useState(1);
  const [playerBombCharges, setPlayerBombCharges] = useState(3);
  const [playerBombBonusScore, setPlayerBombBonusScore] = useState(0);
  const [externalBombEdits, setExternalBombEdits] = useState<Array<{ x: number; y: number }>>([]);
  const [externalBombToken, setExternalBombToken] = useState(0);
  const [secondChance, setSecondChance] = useState(false);
  const [fastHoldReset, setFastHoldReset] = useState(false);
  const [hardDropHoldReset, setHardDropHoldReset] = useState(false);
  const [lastStand, setLastStand] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [chaosDrift, setChaosDrift] = useState(false);
  const [pieceMutation, setPieceMutation] = useState(false);
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
  const playerBoardRef = useRef<number[][] | null>(null);
  const playerBombBonusRef = useRef(0);

  const {
    timeFreezeCharges,
    setTimeFreezeCharges,
    timeFrozen,
    setTimeFrozen,
    timeFreezeDuration,
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
    if (!rngRef.current) return;
    if (slot !== 1) return;
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
        actions.sendEffect(effect);
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [actions, slot, startReady]);

  useEffect(() => {
    if (!pendingEffect) return;
    applyEffect(pendingEffect as RvEffect, false);
    actions.consumePendingEffect();
  }, [actions, pendingEffect]);

  const effectiveDamageReduction = Math.min(0.8, bonusDamageReduction + synergyDamageReduction);
  const dominationActive =
    activeMutations.length > (opponentStatus?.mutations ?? 0);
  const effectiveGravityMultiplier = baseGravityMultiplier * effectGravityMultiplier;
  const effectiveScoreMultiplier =
    scoreMultiplier * bonusScoreMultiplier * (dominationActive ? 1.2 : 1);

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

  // Pas d'expiration automatique sur les perks PVP pour l'instant.

  useEffect(() => {
    if (!startReady) return;
    const status = {
      score: currentScore + playerBombBonusRef.current,
      lines: currentLines,
      mutations: activeMutations.length,
      perks: activePerks.length,
      pendingGarbage: incomingGarbage,
      stackHeight: maxStackHeightRef.current,
      bombs: playerBombCharges,
    };
    actions.sendStatus(status);
  }, [
    actions,
    activeMutations.length,
    activePerks.length,
    currentLines,
    currentScore,
    incomingGarbage,
    playerBombCharges,
    startReady,
  ]);

  const { triggerTimeFreeze } = useTimeFreeze({
    timeFreezeCharges,
    timeFrozen,
    timeFreezeDuration,
    timeFreezeEcho,
    setTimeFreezeCharges,
    setTimeFrozen,
    setActivePerks: () => {},
  });

  const triggerPlayerBombAttack = useCallback(() => {
    if (!startReady || matchOver || selectingReward) return;
    if (playerBombCharges <= 0) return;
    const rng = rngRef.current ?? Math.random;
    const { edits, destroyedBlocks } = computeBombBlast(opponentBoard, rng);
    if (edits.length === 0) return;
    setPlayerBombCharges((v) => Math.max(0, v - 1));
    actions.sendEffect({ type: "bomb_blast", cells: edits });
    const gained = destroyedBlocks * 100;
    if (gained > 0) {
      playerBombBonusRef.current += gained;
      setPlayerBombBonusScore(playerBombBonusRef.current);
    }
  }, [actions, matchOver, opponentBoard, playerBombCharges, selectingReward, startReady]);

  useKeyboardControls((action) => {
    if (action !== "bomb") return;
    triggerPlayerBombAttack();
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
    setInitialRewardGiven(false);
    setStolenBonusScore(0);
    setStolenBonusLines(0);
    setStolenPenaltyScore(0);
    setStolenPenaltyLines(0);
    setLineThiefActive(false);
    setActiveEvent(null);
    setActiveEventCountdown(0);
    setActivePerks([]);
    setActiveMutations([]);
    setScoreMultiplier(1);
    setBonusScoreMultiplier(1);
    setBaseGravityMultiplier(1);
    setEffectGravityMultiplier(1);
    setExtraHoldSlots(0);
    setBombRadius(1);
    setPlayerBombCharges(3);
    playerBombBonusRef.current = 0;
    setPlayerBombBonusScore(0);
    setExternalBombEdits([]);
    setExternalBombToken((v) => v + 1);
    setSecondChance(false);
    setFastHoldReset(false);
    setHardDropHoldReset(false);
    setLastStand(false);
    setChaosMode(false);
    setChaosDrift(false);
    setPieceMutation(false);
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

    if (effect.type === "storm_tick") {
      const amount = doubleGarbage ? effect.count * 2 : effect.count;
      setIncomingGarbage((v) => v + amount);
      return;
    }

    if (effect.type === "bomb_blast") {
      setExternalBombEdits(effect.cells);
      setExternalBombToken((v) => v + 1);
      return;
    }

    if (effect.type === "steal_lines") {
      setStolenPenaltyLines((v) => v + effect.count);
      setStolenPenaltyScore((v) => v + effect.score);
      setCurrentLines((v) => Math.max(0, v - effect.count));
      setCurrentScore((v) => Math.max(0, v - effect.score));
      const amount = doubleGarbage ? effect.count * 2 : effect.count;
      if (amount > 0) setIncomingGarbage((v) => v + amount);
      return;
    }

    if (effect.type === "emp" || effect.type === "blackout") {
      setDisableHold(true);
      setHidePreview(true);
      clearLater(() => {
        setDisableHold(false);
        setHidePreview(false);
      }, effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS[effect.type],
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "gravity") {
      setEffectGravityMultiplier(effect.multiplier);
      clearLater(() => setEffectGravityMultiplier(1), effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS.gravity,
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "mirror") {
      setInvertControls(true);
      clearLater(() => setInvertControls(false), effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS.mirror,
        endsAt: Date.now() + effect.durationMs,
      });
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
      setActiveEvent({
        name: EVENT_LABELS.seed,
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "fog") {
      setFogRows(effect.rows);
      clearLater(() => setFogRows(0), effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS.fog,
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "time_rift") {
      const myScore = currentScore;
      const oppScore = opponentStatus?.score ?? myScore;
      if (myScore < oppScore) {
        setEffectGravityMultiplier(effect.slowMultiplier);
        clearLater(() => setEffectGravityMultiplier(1), effect.durationMs);
      }
      setActiveEvent({
        name: EVENT_LABELS.time_rift,
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "garbage_storm") {
      setGarbageStorm(true);
      clearLater(() => setGarbageStorm(false), effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS.garbage_storm,
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "double_garbage") {
      setDoubleGarbage(true);
      clearLater(() => setDoubleGarbage(false), effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS.double_garbage,
        endsAt: Date.now() + effect.durationMs,
      });
      return;
    }

    if (effect.type === "double_vision") {
      setDoubleVision(true);
      clearLater(() => setDoubleVision(false), effect.durationMs);
      setActiveEvent({
        name: EVENT_LABELS.double_vision,
        endsAt: Date.now() + effect.durationMs,
      });
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
      setGravityMultiplier: (fn) => setBaseGravityMultiplier((v) => fn(v)),
      setScoreMultiplier: (fn) => setScoreMultiplier((v) => fn(v)),
      enableInstable: () => setInstable(true),
    });

    if (mutation.id === "line-thief") {
      setLineThiefActive(true);
    }

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
        const pool = RV_PERKS.filter((p) => !activePerks.some((ap) => ap.id === p.id));
        if (!pool.length) continue;
        const perk = pickWeighted(
          pool.map((p) => ({ item: p, weight: perkRarityWeight(p.rarity) })),
          rng
        );
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
      const perk = RV_PERKS.find((p) => p.id === option.id);
      if (!perk) return;

      const sendTacticalBomb = () => {
        const rng = rngRef.current ?? Math.random;
        const piece = ["I", "O", "T", "S", "Z", "L", "J"][Math.floor(rng() * 7)];
        const bombs: Array<RvEffect> = [
          { type: "emp", durationMs: 5000 },
          { type: "gravity", durationMs: 6000, multiplier: 2 },
          { type: "mirror", durationMs: 3000 },
          { type: "seed", durationMs: 6000, piece, count: 5 },
          { type: "fog", durationMs: 6000, rows: 3 },
        ];
        actions.sendEffect(bombs[Math.floor(rng() * bombs.length)]);
      };

      perk.apply({
        addHoldSlot: () => setExtraHoldSlots((v) => v + 1),
        addTimeFreeze: (count = 1) => setTimeFreezeCharges((v) => v + count),
        addScoreBoost: (value = 0.3) => setScoreMultiplier((v) => v + value),
        sendTacticalBomb,
      });

      setActivePerks((prev) => [
        ...prev,
        {
          id: perk.id,
          name: perk.name,
          description: perk.description,
          icon: perk.icon,
          rarity: perk.rarity ?? "common",
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
      setPlayerBombCharges((v) => v + 1);
      if (option.id === "gravity") setBombRadius(2);
      if (option.id === "fog") setBombRadius(1);
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
    if (!activeEvent) {
      setActiveEventCountdown(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, activeEvent.endsAt - Date.now());
      setActiveEventCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setActiveEvent(null);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [activeEvent]);

  useEffect(() => {
    if (!garbageStorm) return;
    if (slot !== 1) return;
    const interval = setInterval(() => {
      const amount = doubleGarbage ? 2 : 1;
      setIncomingGarbage((v) => v + amount);
      actions.sendEffect({ type: "storm_tick", count: 1 });
    }, 2000);
    return () => clearInterval(interval);
  }, [actions, garbageStorm, doubleGarbage, slot]);

  useEffect(() => {
    if (!selectingReward) return;
    if (rewardDeadline !== null) return;
    if (!rewardOptions.length) return;
    const rng = rngRef.current ?? Math.random;
    const pick = rewardOptions[Math.floor(rng() * rewardOptions.length)];
    handleRewardSelect(pick);
  }, [selectingReward, rewardDeadline, rewardOptions]);

  const triggerInitialReward = () => {
    if (initialRewardGiven) return;
    const options = buildRewardOptions();
    if (!options.length) return;
    setRewardOptions(options);
    setSelectingReward(true);
    setRewardDeadline(Date.now() + 10_000);
    setInitialRewardGiven(true);
    setNextRewardAt(REWARD_INTERVAL_LINES);
  };

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
              // Pas de garbage sur 2/3/4 lignes. On garde seulement le cas 1 ligne.
              if (lines !== 1) return;
              linesSentRef.current += 1;
              actions.sendLinesCleared(1);
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
              if (lineThiefActive && linesCleared > 0) {
                const rng = rngRef.current ?? Math.random;
                if (rng() < 0.3) {
                  setStolenBonusLines((v) => v + 1);
                  setStolenBonusScore((v) => v + 100);
                  setCurrentLines((v) => v + 1);
                  setCurrentScore((v) => v + 100);
                  actions.sendEffect({ type: "steal_lines", count: 1, score: 100 });
                }
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
              playerBoardRef.current = board;
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
              const finalScore = Math.max(
                0,
                score + playerBombBonusRef.current + stolenBonusScore - stolenPenaltyScore
              );
              const finalLines = Math.max(0, lines + stolenBonusLines - stolenPenaltyLines);
              actions.sendGameOver(finalScore, finalLines);
            }}
            hideGameOverOverlay
            onGameStart={() => {
              resetRunTracking();
              startTimeRef.current = Date.now();
              triggerInitialReward();
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
            disableBombKey
            externalBoardEdits={externalBombEdits}
            externalBoardEditToken={externalBombToken}
          />
          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-gray-300 mb-2">Grille adverse</p>
            <OpponentBoard board={opponentBoard} />
            {opponentLeft && <p className="text-yellow-300">Adversaire parti</p>}
            {opponentFinished && !matchOver && (
              <p className="text-green-300">Adversaire a terminé</p>
            )}
            <p className="text-xs text-gray-400 mt-2">Lignes totales: {totalLines}</p>
            <p className="text-xs text-gray-400">Score joueur: {currentScore + playerBombBonusScore}</p>
            <p className="text-xs text-cyan-300">Bombes joueur: {playerBombCharges} (touche B)</p>
            <p className="text-xs text-cyan-300">Bonus bombes: +{playerBombBonusScore}</p>
            <div className="mt-2 w-full max-w-[240px] text-left bg-black/70 border border-slate-500/60 rounded-lg p-3">
              <p className="text-xs text-yellow-300 mb-2">Perks actifs (joueur)</p>
              {activePerks.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun perk actif</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activePerks.map((perk) => {
                    const rarityColor =
                      perk.rarity === "epic"
                        ? "#ff4fd8"
                        : perk.rarity === "rare"
                          ? "#00ffd5"
                          : "#9ca3af";
                    return (
                      <span
                        key={perk.id}
                        className="text-[10px]"
                        style={{
                          border: `1px solid ${rarityColor}`,
                          borderRadius: "999px",
                          padding: "4px 8px",
                          color: "#e5e7eb",
                          background: "rgba(12, 12, 18, 0.9)",
                        }}
                      >
                        {perk.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {activeEvent && (
              <div className="mt-2 w-full max-w-[240px] text-left bg-black/70 border border-cyan-500/60 rounded-lg p-3">
                <p className="text-xs text-cyan-200">Event actif</p>
                <p className="text-sm text-white">{activeEvent.name}</p>
                <p className="text-xs text-gray-300">
                  {activeEventCountdown > 0 ? `${activeEventCountdown}s restantes` : "se termine..."}
                </p>
              </div>
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

function RoguelikeVersusTetrobots() {
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [roundSeed, setRoundSeed] = useState(() => `rv-tetrobots-${Date.now()}`);
  const [roundKey, setRoundKey] = useState(0);
  const [started, setStarted] = useState(false);
  const [botPersonalityId, setBotPersonalityId] = useState<TetrobotsPersonality["id"]>("balanced");
  const [hasSavedResult, setHasSavedResult] = useState(false);
  const [playerIncomingGarbage, setPlayerIncomingGarbage] = useState(0);
  const [botIncomingGarbage, setBotIncomingGarbage] = useState(0);
  const [botBoard, setBotBoard] = useState<number[][] | null>(null);
  const [playerResult, setPlayerResult] = useState<EndResult | null>(null);
  const [botResult, setBotResult] = useState<EndResult | null>(null);
  const [botMessage, setBotMessage] = useState<string | null>(null);
  const [botMood, setBotMood] = useState<BotMood>("idle");
  const [currentScore, setCurrentScore] = useState(0);
  const [currentLines, setCurrentLines] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [nextRewardAt, setNextRewardAt] = useState(REWARD_INTERVAL_LINES);
  const [rewardOptions, setRewardOptions] = useState<RvRewardOption[]>([]);
  const [selectingReward, setSelectingReward] = useState(false);
  const [rewardDeadline, setRewardDeadline] = useState<number | null>(null);
  const [rewardCountdown, setRewardCountdown] = useState(0);
  const [activeMutations, setActiveMutations] = useState<Array<{ mutation: RvMutation; stacks: number }>>([]);
  const [activePerks, setActivePerks] = useState<string[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [bonusScoreMultiplier, setBonusScoreMultiplier] = useState(1);
  const [baseGravityMultiplier, setBaseGravityMultiplier] = useState(1);
  const [effectGravityMultiplier, setEffectGravityMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [bombRadius, setBombRadius] = useState(1);
  const [secondChance, setSecondChance] = useState(false);
  const [fastHoldReset, setFastHoldReset] = useState(false);
  const [hardDropHoldReset, setHardDropHoldReset] = useState(false);
  const [lastStand, setLastStand] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [chaosDrift, setChaosDrift] = useState(false);
  const [pieceMutation, setPieceMutation] = useState(false);
  const [disableHold, setDisableHold] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const [invertControls, setInvertControls] = useState(false);
  const [fogRows, setFogRows] = useState(0);
  const [forcedSequence, setForcedSequence] = useState<string[]>([]);
  const [forcedSequenceToken, setForcedSequenceToken] = useState(0);
  const [botMutations, setBotMutations] = useState(0);
  const [botChaosActive, setBotChaosActive] = useState(false);
  const [botActivePerks, setBotActivePerks] = useState<string[]>([]);
  const [playerBombCharges, setPlayerBombCharges] = useState(3);
  const [botBombCharges, setBotBombCharges] = useState(3);
  const [playerBombBonusScore, setPlayerBombBonusScore] = useState(0);
  const [botBombBonusScore, setBotBombBonusScore] = useState(0);
  const [playerExternalBombEdits, setPlayerExternalBombEdits] = useState<Array<{ x: number; y: number }>>([]);
  const [playerExternalBombToken, setPlayerExternalBombToken] = useState(0);
  const [botExternalBombEdits, setBotExternalBombEdits] = useState<Array<{ x: number; y: number }>>([]);
  const [botExternalBombToken, setBotExternalBombToken] = useState(0);
  const [playerDamageReduction, setPlayerDamageReduction] = useState(0);
  const [playerGarbageMultiplier, setPlayerGarbageMultiplier] = useState(1);
  const [mirrorCurseActive, setMirrorCurseActive] = useState(false);
  const [botScoreMultiplier, setBotScoreMultiplier] = useState(1);
  const [botGravityMultiplier, setBotGravityMultiplier] = useState(1);
  const [botExtraHold, setBotExtraHold] = useState(0);

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
  const botBlunderRef = useRef(false);
  const playerLiveScoreRef = useRef(0);
  const playerLiveLinesRef = useRef(0);
  const botLiveScoreRef = useRef(0);
  const botLiveLinesRef = useRef(0);
  const playerBoardRef = useRef<number[][] | null>(null);
  const botBoardRef = useRef<number[][] | null>(null);
  const playerBombBonusRef = useRef(0);
  const botBombBonusRef = useRef(0);
  const botLastMessageAtRef = useRef(0);
  const botMoodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerSynergyIdsRef = useRef<Set<string>>(new Set());
  const playerMaxSynergyCountRef = useRef(0);
  const botActivatedSynergyRef = useRef(false);
  const botSynergyCountRef = useRef(0);
  const bombsSentRef = useRef(0);
  const botHadChaosRef = useRef(false);
  const botPerksRef = useRef<Set<string>>(new Set());
  const matchStartAnnouncedRef = useRef(false);
  const longMatchAnnouncedRef = useRef(false);
  const comebackAnnouncedRef = useRef(false);
  const playerStackSumRef = useRef(0);
  const playerStackSamplesRef = useRef(0);
  const playerAggressionScoreRef = useRef(0);
  const botStrategyRef = useRef<BotStrategy>("neutral");
  const botStrategyShiftCountRef = useRef(0);
  const aggressiveDetectAnnouncedRef = useRef(false);
  const defensiveDetectAnnouncedRef = useRef(false);
  const comboSpamAnnouncedRef = useRef(false);
  const highRiskAnnouncedRef = useRef(false);
  const exploitingPatternAnnouncedRef = useRef(false);
  const analysisCompleteAnnouncedRef = useRef(false);
  const lastAdaptiveEventAtRef = useRef(0);
  const playerProfileRef = useRef<PlayerProfile | null>(null);
  const playerStyleRef = useRef<PlayerStyle>("balanced");
  const memoryDialogueTriggeredRef = useRef(false);
  const sameBotMatchesRef = useRef(0);
  const redZoneTimeMsRef = useRef(0);
  const lastBoardSampleAtRef = useRef<number | null>(null);
  const inRedZoneRef = useRef(false);
  const comboSampleCountRef = useRef(0);
  const comboValueSumRef = useRef(0);
  const lastTrollAtRef = useRef(0);

  const matchOver = started && (!!playerResult || !!botResult);
  const botPersonality = getTetrobotsPersonality(botPersonalityId);
  const botBubbleAccent = getBotBubbleAccent(botPersonality);
  const playerRng = useMemo(() => createRng(roundSeed), [roundSeed]);
  const botRng = useMemo(() => createRng(roundSeed), [roundSeed]);

  const {
    timeFreezeCharges,
    setTimeFreezeCharges,
    timeFrozen,
    setTimeFrozen,
    timeFreezeDuration,
    timeFreezeEcho,
    setTimeFreezeEcho,
    resetTimeFreezeState,
  } = useTimeFreezeState();

  const { triggerTimeFreeze } = useTimeFreeze({
    timeFreezeCharges,
    timeFrozen,
    timeFreezeDuration,
    timeFreezeEcho,
    setTimeFreezeCharges,
    setTimeFrozen,
    setActivePerks: () => {},
  });

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  const emitBotEvent = (event: BotEvent, bypassCooldown = false) => {
    const now = Date.now();
    if (!bypassCooldown && now - botLastMessageAtRef.current < 2200) return;
    const message = getBotMessage(botPersonality, event);
    const mood = getMoodFromEvent(botPersonality, event.type);
    setBotMood(mood);
    if (botMoodTimeoutRef.current) clearTimeout(botMoodTimeoutRef.current);
    if (mood !== "thinking") {
      botMoodTimeoutRef.current = setTimeout(() => setBotMood("idle"), mood === "glitch" ? 700 : 1300);
    }
    if (!message) return;
    botLastMessageAtRef.current = now;
    setBotMessage(message);
  };

  const emitCustomBotLine = (
    message: string,
    mood: BotMood = "thinking",
    bypassCooldown = false
  ) => {
    const now = Date.now();
    if (!bypassCooldown && now - botLastMessageAtRef.current < 2200) return;
    botLastMessageAtRef.current = now;
    setBotMood(mood);
    if (botMoodTimeoutRef.current) clearTimeout(botMoodTimeoutRef.current);
    if (mood !== "thinking") {
      botMoodTimeoutRef.current = setTimeout(() => setBotMood("idle"), 1300);
    }
    setBotMessage(message);
  };

  const canEmitAdaptiveEvent = (
    options: { minMatchMs?: number; minLines?: number; minIntervalMs?: number } = {}
  ) => {
    const {
      minMatchMs = MEMORY_TIMING.adaptiveMinMatchMs,
      minLines = MEMORY_TIMING.adaptiveMinLines,
      minIntervalMs = MEMORY_TIMING.adaptiveEventCooldownMs,
    } = options;
    if (!started || matchOver) return false;
    if (playerLiveLinesRef.current < minLines) return false;
    const now = Date.now();
    if (startTimeRef.current && now - startTimeRef.current < minMatchMs) return false;
    if (now - lastAdaptiveEventAtRef.current < minIntervalMs) return false;
    lastAdaptiveEventAtRef.current = now;
    return true;
  };

  const perkRarityWeight = (rarity: "common" | "rare" | "epic" = "common") => {
    if (rarity === "epic") return 0.7;
    if (rarity === "rare") return 1.4;
    return 2.6;
  };

  const botRarityBias = (rarity: "common" | "rare" | "epic" = "common") => {
    if (botPersonalityId === "rookie") {
      if (rarity === "epic") return 0.6;
      if (rarity === "rare") return 1;
      return 1.6;
    }
    if (botPersonalityId === "balanced") {
      if (rarity === "epic") return 1;
      if (rarity === "rare") return 1.2;
      return 1.2;
    }
    if (rarity === "epic") return 1.9;
    if (rarity === "rare") return 1.3;
    return 0.8;
  };

  const applyBotPerk = (perkId: string) => {
    if (botPerksRef.current.has(perkId)) return;
    botPerksRef.current.add(perkId);
    setBotActivePerks((prev) => [...prev, perkId]);

    if (perkId === "rv-extra-hold") {
      setBotExtraHold((v) => v + 1);
      return;
    }
    if (perkId === "rv-time-freeze") {
      applyTimed(() => setTimeFrozen(true), () => setTimeFrozen(false), 2500);
      return;
    }
    if (perkId === "rv-score-boost") {
      setBotScoreMultiplier((v) => v * 1.2);
      return;
    }
    if (perkId === "rv-tactical-bomb") {
      setBotBombCharges((v) => v + 1);
      applyPlayerDebuff({ type: "gravity", durationMs: 4500, multiplier: 1.35 });
      emitBotEvent({ type: "bot_perk_pick", perk: perkId }, true);
    }
  };

  const pickBotPerkId = () => {
    const available = RV_PERKS.filter((p) => !botPerksRef.current.has(p.id));
    if (!available.length) return null;
    const weighted = available.map((perk) => {
      let weight = botRarityBias(perk.rarity);
      const levelFactor = Math.max(0, (levelRef.current - 5) * 0.08);
      weight *= 1 + levelFactor;
      if (botPersonalityId === "apex" && perk.id === "rv-tactical-bomb") weight *= 2;
      if (botPersonalityId === "rookie" && perk.id === "rv-tactical-bomb") weight *= 0.5;
      return { item: perk.id, weight };
    });
    return pickWeighted(weighted, botRng);
  };

  const getPerkRarityById = (id: string) =>
    RV_PERKS.find((p) => p.id === id)?.rarity ?? "common";

  const pushGarbageToPlayer = (amount: number) => {
    if (amount <= 0) return;
    const reduced = Math.max(0, Math.round(amount * (1 - playerDamageReduction)));
    if (reduced <= 0) return;
    setPlayerIncomingGarbage((v) => v + reduced);
  };

  const pushGarbageToBot = (amount: number) => {
    if (amount <= 0) return;
    const boosted = Math.max(0, Math.round(amount * playerGarbageMultiplier));
    if (boosted <= 0) return;
    setBotIncomingGarbage((v) => v + boosted);
  };

  const computeBombEdits = (board: number[][] | null, rng: () => number) => {
    if (!board || board.length === 0 || board[0].length === 0) {
      return { edits: [] as Array<{ x: number; y: number }>, destroyedBlocks: 0 };
    }
    const rows = board.length;
    const cols = board[0].length;
    const filledCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (board[y][x] !== 0) filledCells.push({ x, y });
      }
    }

    const anchor =
      filledCells.length > 0
        ? filledCells[Math.floor(rng() * filledCells.length)]
        : { x: Math.floor(rng() * cols), y: Math.floor(rng() * rows) };

    const edits: Array<{ x: number; y: number }> = [];
    let destroyedBlocks = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const tx = anchor.x + dx;
        const ty = anchor.y + dy;
        if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) continue;
        if (board[ty][tx] !== 0) destroyedBlocks += 1;
        edits.push({ x: tx, y: ty });
      }
    }
    return { edits, destroyedBlocks };
  };

  const triggerPlayerBombAttack = useCallback(() => {
    if (!started || matchOver || selectingReward) return;
    if (playerBombCharges <= 0) return;
    const { edits, destroyedBlocks } = computeBombEdits(botBoardRef.current, playerRng);
    if (edits.length === 0) return;
    setPlayerBombCharges((v) => Math.max(0, v - 1));
    setBotExternalBombEdits(edits);
    setBotExternalBombToken((v) => v + 1);
    const gained = destroyedBlocks * 100;
    if (gained > 0) {
      playerBombBonusRef.current += gained;
      setPlayerBombBonusScore(playerBombBonusRef.current);
    }
    bombsSentRef.current += 1;
    emitBotEvent({ type: "bomb_sent" });
  }, [matchOver, playerBombCharges, playerRng, selectingReward, started]);

  const triggerBotBombAttack = useCallback(() => {
    if (!started || matchOver) return;
    if (botBombCharges <= 0) return;
    const { edits, destroyedBlocks } = computeBombEdits(playerBoardRef.current, botRng);
    if (edits.length === 0) return;
    setBotBombCharges((v) => Math.max(0, v - 1));
    setPlayerExternalBombEdits(edits);
    setPlayerExternalBombToken((v) => v + 1);
    const gained = destroyedBlocks * 100;
    if (gained > 0) {
      botBombBonusRef.current += gained;
      setBotBombBonusScore(botBombBonusRef.current);
    }
    emitBotEvent({ type: "bomb_sent" });
  }, [botBombCharges, botRng, matchOver, started]);

  const maybeEmitComeback = () => {
    if (!started || matchOver) return;
    const playerScore = playerLiveScoreRef.current + playerBombBonusRef.current;
    const botScore = botLiveScoreRef.current + botBombBonusRef.current;
    if (playerScore < botScore) {
      comebackAnnouncedRef.current = true;
      return;
    }
    if (comebackAnnouncedRef.current && playerScore > botScore) {
      emitBotEvent({ type: "comeback" });
      comebackAnnouncedRef.current = false;
    }
  };

  useEffect(() => {
    if (!started || matchOver) return;
    let cancelled = false;
    getTetrobotsProfile()
      .then(({ profile, style }) => {
        if (cancelled) return;
        playerProfileRef.current = profile;
        playerStyleRef.current = style;
        const sameBotMatches =
          botPersonalityId === "rookie"
            ? profile.matchesVsRookie
            : botPersonalityId === "balanced"
              ? profile.matchesVsBalanced
              : profile.matchesVsApex;
        sameBotMatchesRef.current = sameBotMatches;
        if (profile.totalMatches >= 1) {
          emitCustomBotLine(getMemoryDialogue(botPersonality, style), "thinking", true);
          memoryDialogueTriggeredRef.current = true;
        }
      })
      .catch(() => {
        // fallback local si api indisponible
      });
    return () => {
      cancelled = true;
    };
  }, [botPersonality, botPersonalityId, matchOver, started]);

  const shouldBotUseBomb = useCallback(() => {
    if (botBombCharges <= 0) return false;
    const board = playerBoardRef.current;
    if (!board) return false;

    const playerStack = getStackHeight(board);
    const playerUnderPressure = playerStack >= 12 || playerIncomingGarbage >= 6;
    const botLosing =
      botLiveScoreRef.current + botBombBonusRef.current <
      playerLiveScoreRef.current + playerBombBonusRef.current;

    let chance =
      botPersonalityId === "apex"
        ? 0.28
        : botPersonalityId === "balanced"
          ? 0.16
          : 0.08;

    if (playerUnderPressure) {
      chance +=
        botPersonalityId === "apex"
          ? 0.52
          : botPersonalityId === "balanced"
            ? 0.35
            : 0.2;
    }
    if (botLosing) {
      chance +=
        botPersonalityId === "apex"
          ? 0.18
          : botPersonalityId === "balanced"
            ? 0.12
            : 0.06;
    }

    chance = Math.min(0.95, chance);
    return botRng() < chance;
  }, [botBombCharges, botPersonalityId, botRng, playerIncomingGarbage]);

  useKeyboardControls((action) => {
    if (action !== "bomb") return;
    triggerPlayerBombAttack();
  });

  const applyTimed = (apply: () => void, clear: () => void, durationMs: number) => {
    apply();
    setTimeout(clear, durationMs);
  };

  const applyPlayerDebuff = (effect: RvEffect) => {
    if (
      mirrorCurseActive &&
      (effect.type === "emp" ||
        effect.type === "gravity" ||
        effect.type === "mirror" ||
        effect.type === "seed" ||
        effect.type === "fog")
    ) {
      if (botRng() < 0.5) {
        pushGarbageToBot(1);
      }
    }

    if (effect.type === "emp" || effect.type === "blackout") {
      applyTimed(
        () => {
          setDisableHold(true);
          setHidePreview(true);
        },
        () => {
          setDisableHold(false);
          setHidePreview(false);
        },
        effect.durationMs
      );
      return;
    }
    if (effect.type === "gravity") {
      applyTimed(
        () => setEffectGravityMultiplier(effect.multiplier),
        () => setEffectGravityMultiplier(1),
        effect.durationMs
      );
      return;
    }
    if (effect.type === "mirror") {
      applyTimed(
        () => setInvertControls(true),
        () => setInvertControls(false),
        effect.durationMs
      );
      return;
    }
    if (effect.type === "seed") {
      const sequence = Array.from({ length: effect.count }, () => effect.piece);
      setForcedSequence(sequence);
      setForcedSequenceToken((v) => v + 1);
      setTimeout(() => {
        setForcedSequence([]);
        setForcedSequenceToken((v) => v + 1);
      }, effect.durationMs);
      return;
    }
    if (effect.type === "fog") {
      applyTimed(() => setFogRows(effect.rows), () => setFogRows(0), effect.durationMs);
    }
  };

  const applyMutation = (mutation: RvMutation) => {
    const existing = activeMutations.find((m) => m.mutation.id === mutation.id);
    if (existing && mutation.unique) return;
    if (existing && mutation.stackable && mutation.maxStacks && existing.stacks >= mutation.maxStacks) return;

    mutation.apply({
      setGravityMultiplier: (fn) => setBaseGravityMultiplier((v) => fn(v)),
      setScoreMultiplier: (fn) => setScoreMultiplier((v) => fn(v)),
      enableInstable: () => setPieceMutation(true),
    });

    if (mutation.id === "chaos-protocol") {
      setChaosMode(true);
    }
    if (mutation.id === "chaos-drift") {
      setChaosDrift(true);
    }

    setActiveMutations((prev) => {
      const current = prev.find((m) => m.mutation.id === mutation.id);
      if (!current) return [...prev, { mutation, stacks: 1 }];
      const nextStacks = mutation.stackable
        ? Math.min(current.stacks + 1, mutation.maxStacks ?? current.stacks + 1)
        : current.stacks;
      return prev.map((m) => (m.mutation.id === mutation.id ? { ...m, stacks: nextStacks } : m));
    });

    emitBotEvent({ type: "player_mutation", id: mutation.id });
  };

  const buildRewardOptions = () => {
    const rng = playerRng;
    const categories = [
      { kind: "perk" as const, weight: 2 },
      { kind: "mutation" as const, weight: 2 },
      { kind: "bomb" as const, weight: 2.2 },
      { kind: "bonus" as const, weight: 1.7 },
      { kind: "debuff" as const, weight: 1.2 },
    ];

    const options: RvRewardOption[] = [];
    const used = new Set<string>();
    while (options.length < 3) {
      const kind = pickWeighted(categories.map((c) => ({ item: c.kind, weight: c.weight })), rng);
      if (kind === "perk") {
        const pool = RV_PERKS.filter((p) => !activePerks.includes(p.id));
        if (!pool.length) continue;
        const perk = pickWeighted(
          pool.map((p) => ({
            item: p,
            weight: perkRarityWeight(p.rarity),
          })),
          rng
        );
        if (!perk || used.has(perk.id)) continue;
        used.add(perk.id);
        options.push({ kind: "perk", id: perk.id, title: perk.name, description: perk.description });
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
      const perk = RV_PERKS.find((p) => p.id === option.id);
      if (!perk) return;
      perk.apply({
        addHoldSlot: () => setExtraHoldSlots((v) => v + 1),
        addTimeFreeze: (count = 1) => setTimeFreezeCharges((v) => v + count),
        addScoreBoost: (value = 0.3) => setScoreMultiplier((v) => v + value),
        sendTacticalBomb: () => {
          pushGarbageToBot(2);
          applyTimed(
            () => setBotGravityMultiplier((v) => v * 1.2),
            () => setBotGravityMultiplier(1),
            3500
          );
          bombsSentRef.current += 1;
          emitBotEvent({ type: "bomb_sent" });
        },
      });
      setActivePerks((prev) => [...prev, perk.id]);
      emitBotEvent({ type: "player_perk_pick", perk: perk.id });
      return;
    }

    if (option.kind === "mutation") {
      const mutation = RV_MUTATIONS.find((m) => m.id === option.id);
      if (!mutation) return;
      applyMutation(mutation);
      return;
    }

    if (option.kind === "bomb") {
      setPlayerBombCharges((v) => v + 1);
      if (option.id === "gravity") setBombRadius(2);
      if (option.id === "fog") setBombRadius(1);
      return;
    }

    if (option.kind === "bonus") {
      if (option.id === "shield") {
        setLastStand(true);
        setTimeout(() => setLastStand(false), 10_000);
      }
      if (option.id === "score_boost") {
        setBonusScoreMultiplier(1.3);
        setTimeout(() => setBonusScoreMultiplier(1), 15_000);
      }
      if (option.id === "time_freeze") {
        setTimeFreezeCharges((v) => v + 1);
      }
      return;
    }

    if (option.kind === "debuff") {
      if (option.id === "slow") {
        pushGarbageToBot(1);
      }
      if (option.id === "invert") {
        pushGarbageToBot(1);
      }
      if (option.id === "preview_off") {
        pushGarbageToBot(1);
      }
    }
  };

  const getActiveSynergies = () => {
    const ctx = {
      myMutations: activeMutations.length,
      oppMutations: botMutations,
      myGarbage: playerIncomingGarbage,
      oppGarbage: botIncomingGarbage,
    };
    return RV_SYNERGIES.filter((s) => s.isActive(ctx));
  };

  useEffect(() => {
    const active = getActiveSynergies();
    let nextGarbageMultiplier = 1;
    let nextDamageReduction = 0;
    let nextMirrorCurse = false;

    active.forEach((synergy) => {
      synergy.apply({
        setGarbageMultiplier: (fn) => {
          nextGarbageMultiplier = fn(nextGarbageMultiplier);
        },
        enableMirrorCurse: () => {
          nextMirrorCurse = true;
        },
        setDamageReduction: (value) => {
          nextDamageReduction = Math.max(nextDamageReduction, value);
        },
      });
    });

    setPlayerGarbageMultiplier(nextGarbageMultiplier);
    setPlayerDamageReduction(nextDamageReduction);
    setMirrorCurseActive(nextMirrorCurse);

    playerMaxSynergyCountRef.current = Math.max(playerMaxSynergyCountRef.current, active.length);
    active.forEach((synergy) => {
      if (playerSynergyIdsRef.current.has(synergy.id)) return;
      playerSynergyIdsRef.current.add(synergy.id);
      emitBotEvent({ type: "player_synergy", id: synergy.id });
    });
  }, [activeMutations.length, botIncomingGarbage, botMutations, playerIncomingGarbage]);

  useEffect(() => {
    if (!selectingReward || !rewardDeadline) {
      setRewardCountdown(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, rewardDeadline - Date.now());
      setRewardCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) setRewardDeadline(null);
    }, 200);
    return () => clearInterval(interval);
  }, [selectingReward, rewardDeadline]);

  useEffect(() => {
    if (!selectingReward || rewardDeadline !== null || !rewardOptions.length) return;
    handleRewardSelect(rewardOptions[Math.floor(playerRng() * rewardOptions.length)]);
  }, [selectingReward, rewardDeadline, rewardOptions, playerRng]);

  useEffect(() => {
    if (!started || matchOver) return;
    const milestone = REWARD_INTERVAL_LINES * (botPerksRef.current.size + 1);
    if (totalLines < milestone) return;
    const perkId = pickBotPerkId();
    if (!perkId) return;
    applyBotPerk(perkId);
    emitBotEvent({ type: "bot_perk_pick", perk: perkId }, true);
  }, [applyBotPerk, matchOver, started, totalLines]);

  useEffect(() => {
    if (!started || matchOver) return;
    const timeout = setTimeout(() => {
      if (longMatchAnnouncedRef.current) return;
      longMatchAnnouncedRef.current = true;
      emitBotEvent({ type: "long_match" });
    }, 90_000);
    return () => clearTimeout(timeout);
  }, [started, matchOver, botPersonalityId]);

  useEffect(() => {
    if (!started || matchOver) return;
    const interval = setInterval(() => {
      const roll = botRng();

      if (shouldBotUseBomb()) {
        triggerBotBombAttack();
        return;
      }

      if (roll < 0.35) {
        const effects: RvEffect[] = [
          { type: "emp", durationMs: 5000 },
          { type: "gravity", durationMs: 6000, multiplier: 1.4 },
          { type: "mirror", durationMs: 3000 },
          { type: "fog", durationMs: 5000, rows: 3 },
        ];
        const effect = effects[Math.floor(botRng() * effects.length)];
        applyPlayerDebuff(effect);
        return;
      }

      if (roll < 0.65) {
        setBotMutations((v) => v + 1);
        return;
      }

      if (roll < 0.85 && botMutations >= 2) {
        botActivatedSynergyRef.current = true;
        botSynergyCountRef.current += 1;
        emitBotEvent({ type: "bot_synergy", id: `rv-syn-${botSynergyCountRef.current}` }, true);
        pushGarbageToPlayer(2);
        const canTriggerChaos =
          (botPersonalityId === "apex" && botSynergyCountRef.current >= 2) ||
          (botPersonalityId === "balanced" &&
            botSynergyCountRef.current >= 3 &&
            botRng() < 0.4);
        if (canTriggerChaos) {
          botHadChaosRef.current = true;
          setBotChaosActive(true);
          emitBotEvent({ type: "chaos_triggered" }, true);
          setTimeout(() => setBotChaosActive(false), 9000);
        }
        return;
      }

      emitBotEvent({ type: "huge_attack" });
      pushGarbageToPlayer(3);
    }, 14_000);
    return () => clearInterval(interval);
  }, [
    botMutations,
    botPersonalityId,
    botRng,
    matchOver,
    shouldBotUseBomb,
    started,
    triggerBotBombAttack,
  ]);

  useEffect(() => {
    if (!started) return;
    if (!playerResult && !botResult) return;
    if (playerResult && botResult) return;

    if (startTimeRef.current && runDurationRef.current === 0) {
      runDurationRef.current = Date.now() - startTimeRef.current;
    }

    if (playerResult && !botResult) {
      setBotResult({
        score: Math.max(botLiveScoreRef.current + botBombBonusRef.current, playerResult.score + 1),
        lines: botLiveLinesRef.current,
      });
      return;
    }

    if (botResult && !playerResult) {
      setPlayerResult({
        score: Math.max(playerLiveScoreRef.current + playerBombBonusRef.current, botResult.score + 1),
        lines: playerLiveLinesRef.current,
      });
    }
  }, [started, playerResult, botResult]);

  useEffect(() => {
    if (!matchOver || !playerResult || !botResult) return;
    emitBotEvent({ type: botResult.score > playerResult.score ? "bot_win" : "bot_lose" }, true);
  }, [matchOver, playerResult, botResult, botPersonalityId]);

  useEffect(() => {
    return () => {
      if (botMoodTimeoutRef.current) clearTimeout(botMoodTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!matchOver || !playerResult || !botResult || finalizedRef.current) return;

    const win = playerResult.score > botResult.score;
    const perfectWin = win && maxStackHeightRef.current < RED_ZONE_HEIGHT;
    const durationMs = runDurationRef.current;
    const noHold = holdCountRef.current === 0;
    const noHardDrop = hardDropCountRef.current === 0;
    const level = levelRef.current;
    const wonVsApex = win && botPersonalityId === "apex";
    const comboAvg =
      comboSampleCountRef.current > 0
        ? comboValueSumRef.current / comboSampleCountRef.current
        : 0;
    const totalRunMs = Math.max(1, durationMs);
    const redZoneRate = Math.max(0, Math.min(1, redZoneTimeMsRef.current / totalRunMs));
    const playerHoles = countBoardHoles(playerBoardRef.current);
    let sameScoreTwice = false;

    const next = updateStats((prev) => {
      sameScoreTwice = prev.lastScore !== null && prev.lastScore === playerResult.score;
      return {
        ...prev,
        roguelikeVersusMatches: prev.roguelikeVersusMatches + 1,
        roguelikeVersusWins: prev.roguelikeVersusWins + (win ? 1 : 0),
        roguelikeVersusWinStreak: win ? prev.roguelikeVersusWinStreak + 1 : 0,
        roguelikeVersusLinesSent: prev.roguelikeVersusLinesSent + linesSentRef.current,
        scoredModes: {
          ...prev.scoredModes,
          ROGUELIKE_VERSUS: playerResult.score > 0 ? true : prev.scoredModes.ROGUELIKE_VERSUS,
        },
        level10Modes: {
          ...prev.level10Modes,
          ROGUELIKE_VERSUS: level >= 10 ? true : prev.level10Modes.ROGUELIKE_VERSUS,
        },
        playtimeMs: prev.playtimeMs + durationMs,
        noHoldRuns: prev.noHoldRuns + (noHold ? 1 : 0),
        hardDropCount: prev.hardDropCount + hardDropCountRef.current,
        lastScore: playerResult.score,
      };
    });

    checkAchievements({
      mode: "ROGUELIKE_VERSUS",
      score: playerResult.score,
      lines: playerResult.lines,
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
        rv_win_after_bot_synergy: win && botActivatedSynergyRef.current,
        rv_apex_chaos_win: wonVsApex && botHadChaosRef.current,
        rv_10_bombs_sent: bombsSentRef.current >= 10,
        rv_more_mutations_than_bot: activeMutations.length > botMutations,
        rv_apex_3_synergies_win: wonVsApex && playerMaxSynergyCountRef.current >= 3,
      },
    });

    updateTetrobotsProfile({
      avgHeight:
        playerStackSamplesRef.current > 0
          ? playerStackSumRef.current / playerStackSamplesRef.current
          : 0,
      holes: playerHoles,
      comboAvg,
      tetrisRate:
        playerLiveLinesRef.current > 0
          ? tetrisCountRef.current / playerLiveLinesRef.current
          : 0,
      linesSent: linesSentRef.current,
      linesSurvived: playerLiveLinesRef.current,
      redZoneTime: redZoneRate,
      leftBias: getLeftBias(playerBoardRef.current),
      usedHold: holdCountRef.current > 0,
      botPersonality: botPersonalityId,
    })
      .then(({ profile, style }) => {
        playerProfileRef.current = profile;
        playerStyleRef.current = style;
        if (botPersonalityId === "rookie") sameBotMatchesRef.current = profile.matchesVsRookie;
        else if (botPersonalityId === "balanced")
          sameBotMatchesRef.current = profile.matchesVsBalanced;
        else sameBotMatchesRef.current = profile.matchesVsApex;
      })
      .catch(() => {
        // non-bloquant
      });

    finalizedRef.current = true;
  }, [activeMutations.length, botMutations, botPersonalityId, botResult, checkAchievements, matchOver, playerResult, updateStats]);

  useEffect(() => {
    if (!matchOver || !playerResult || !botResult || !user || hasSavedResult) return;
    const payload = {
      matchId: roundSeed,
      players: [
        { slot: 1, userId: user.id, pseudo: user.pseudo, score: playerResult.score, lines: playerResult.lines },
        { slot: 2, pseudo: botPersonality.name, score: botResult.score, lines: botResult.lines },
      ],
    };

    saveRoguelikeVersusMatch(payload).catch((err) =>
      console.error("Erreur enregistrement match roguelike versus (Tetrobots) :", err)
    );
    setHasSavedResult(true);
  }, [botPersonality.name, botResult, hasSavedResult, matchOver, playerResult, roundSeed, user]);

  const effectiveGravityMultiplier = baseGravityMultiplier * effectGravityMultiplier;
  const effectiveScoreMultiplier = scoreMultiplier * bonusScoreMultiplier;

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
    playerLiveScoreRef.current = 0;
    playerLiveLinesRef.current = 0;
    botLiveScoreRef.current = 0;
    botLiveLinesRef.current = 0;
    botBlunderRef.current = false;
    playerSynergyIdsRef.current = new Set();
    playerMaxSynergyCountRef.current = 0;
    botActivatedSynergyRef.current = false;
    botSynergyCountRef.current = 0;
    bombsSentRef.current = 0;
    botHadChaosRef.current = false;
    botPerksRef.current = new Set();
    matchStartAnnouncedRef.current = false;
    longMatchAnnouncedRef.current = false;
    comebackAnnouncedRef.current = false;
    playerStackSumRef.current = 0;
    playerStackSamplesRef.current = 0;
    playerAggressionScoreRef.current = 0;
    botStrategyRef.current = "neutral";
    botStrategyShiftCountRef.current = 0;
    aggressiveDetectAnnouncedRef.current = false;
    defensiveDetectAnnouncedRef.current = false;
    comboSpamAnnouncedRef.current = false;
    highRiskAnnouncedRef.current = false;
    exploitingPatternAnnouncedRef.current = false;
    analysisCompleteAnnouncedRef.current = false;
    lastAdaptiveEventAtRef.current = 0;
    memoryDialogueTriggeredRef.current = false;
    sameBotMatchesRef.current = 0;
    redZoneTimeMsRef.current = 0;
    lastBoardSampleAtRef.current = null;
    inRedZoneRef.current = false;
    comboSampleCountRef.current = 0;
    comboValueSumRef.current = 0;
    lastTrollAtRef.current = 0;

    setBotMessage(null);
    setBotMood("idle");
    setCurrentScore(0);
    setCurrentLines(0);
    setTotalLines(0);
    setNextRewardAt(REWARD_INTERVAL_LINES);
    setRewardOptions([]);
    setSelectingReward(false);
    setRewardDeadline(null);
    setRewardCountdown(0);
    setActiveMutations([]);
    setActivePerks([]);
    setScoreMultiplier(1);
    setBonusScoreMultiplier(1);
    setBaseGravityMultiplier(1);
    setEffectGravityMultiplier(1);
    setExtraHoldSlots(0);
    setBombRadius(1);
    setSecondChance(false);
    setFastHoldReset(false);
    setHardDropHoldReset(false);
    setLastStand(false);
    setChaosMode(false);
    setChaosDrift(false);
    setPieceMutation(false);
    setDisableHold(false);
    setHidePreview(false);
    setInvertControls(false);
    setFogRows(0);
    setForcedSequence([]);
    setForcedSequenceToken((v) => v + 1);
    setBotMutations(0);
    setBotChaosActive(false);
    setBotActivePerks([]);
    setPlayerBombCharges(3);
    setBotBombCharges(3);
    playerBombBonusRef.current = 0;
    botBombBonusRef.current = 0;
    setPlayerBombBonusScore(0);
    setBotBombBonusScore(0);
    setPlayerExternalBombEdits([]);
    setPlayerExternalBombToken((v) => v + 1);
    setBotExternalBombEdits([]);
    setBotExternalBombToken((v) => v + 1);
    setPlayerDamageReduction(0);
    setPlayerGarbageMultiplier(1);
    setMirrorCurseActive(false);
    setBotScoreMultiplier(1);
    setBotGravityMultiplier(1);
    setBotExtraHold(0);
    resetTimeFreezeState();
    setTimeFreezeEcho(false);
  };

  const startMatch = () => {
    setRoundSeed(`rv-tetrobots-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`);
    setRoundKey((v) => v + 1);
    setStarted(true);
    setHasSavedResult(false);
    setPlayerIncomingGarbage(0);
    setBotIncomingGarbage(0);
    setBotBoard(null);
    setPlayerResult(null);
    setBotResult(null);
    resetRunTracking();
  };

  const backToLobby = () => {
    setStarted(false);
    setHasSavedResult(false);
    setPlayerIncomingGarbage(0);
    setBotIncomingGarbage(0);
    setBotBoard(null);
    setPlayerResult(null);
    setBotResult(null);
    resetRunTracking();
  };

  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-10">
        <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">
          Roguelike Versus - Solo
        </h1>
        <div
          className="w-[90%] max-w-[820px]"
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 0 18px #ff00ff",
          }}
        >
          <p className="text-sm text-cyan-200 text-left mb-4">
            {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
          </p>
          <div className="text-left flex flex-col gap-3">
            <label className="text-xs text-yellow-300 uppercase tracking-wide">Adversaire bot</label>
            <select
              value={botPersonalityId}
              onChange={(e) => setBotPersonalityId(e.target.value as TetrobotsPersonality["id"])}
              className="retro-select w-full"
            >
              {TETROBOTS_PERSONALITIES.map((personality) => (
                <option key={personality.id} value={personality.id}>
                  {personality.name} - {personality.difficultyLabel}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-300">{botPersonality.description}</p>
            <button className="retro-btn self-start mt-2" onClick={startMatch}>
              Lancer le duel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myScore = playerResult?.score ?? 0;
  const myLines = playerResult?.lines ?? 0;
  const enemyScore = botResult?.score ?? 0;
  const enemyLines = botResult?.lines ?? 0;

  return (
    <div
      className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative"
      key={roundKey}
    >
      <h1 className="text-3xl text-yellow-400 mb-2 drop-shadow-[0_0_15px_#ff00ff]">Roguelike VS Tetrobots</h1>
      <p className="text-xs text-cyan-200 mb-4">
        {botPersonality.name} - {botPersonality.difficultyLabel}
      </p>

      <div className="flex gap-6 items-start flex-wrap justify-center">
        <div
          style={{
            width: "420px",
            maxWidth: "95vw",
            background: "rgba(8, 8, 12, 0.86)",
            border: "1px solid #2a2a3a",
            borderRadius: "12px",
            padding: "14px",
            boxShadow: "0 0 18px rgba(211, 107, 255, 0.25)",
          }}
        >
          <p className="text-xs text-yellow-300 mb-2 text-left">HUD Roguelike</p>
          <p className="text-xs text-gray-300 text-left">Lignes totales: {totalLines}</p>
          <p className="text-xs text-gray-300 text-left">
            Score joueur: {currentScore + playerBombBonusScore}
          </p>
          <p className="text-xs text-gray-300 text-left mb-3">Lignes joueur: {currentLines}</p>
          <p className="text-xs text-cyan-300 text-left mb-1">
            Bombes joueur: {playerBombCharges} (touche B)
          </p>
          <p className="text-xs text-cyan-300 text-left mb-3">
            Bonus bombes: +{playerBombBonusScore}
          </p>
          <div className="perks-panel text-left" style={{ maxHeight: "none", marginBottom: "10px" }}>
            <p className="text-xs text-yellow-300 mb-2">Perks actifs (joueur)</p>
            {activePerks.length === 0 ? (
              <p className="perks-empty">Aucun perk actif</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activePerks.map((perkId) => {
                  const perk = RV_PERKS.find((p) => p.id === perkId);
                  const rarity = perk?.rarity ?? "common";
                  const rarityColor =
                    rarity === "epic" ? "#ff4fd8" : rarity === "rare" ? "#00ffd5" : "#9ca3af";
                  return (
                    <span
                      key={perkId}
                      className="text-[10px]"
                      style={{
                        border: `1px solid ${rarityColor}`,
                        borderRadius: "999px",
                        padding: "4px 8px",
                        color: "#e5e7eb",
                        background: "rgba(12, 12, 18, 0.9)",
                      }}
                    >
                      {perk?.name ?? perkId}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {selectingReward && rewardOptions.length > 0 ? (
            <div
              className="perk-modal"
              style={{
                padding: "12px",
                textAlign: "left",
                boxShadow: "0 0 24px rgba(211, 107, 255, 0.35)",
              }}
            >
              <p className="text-xs text-yellow-300 mb-2">
                Choisis une récompense ({rewardCountdown}s)
              </p>
              <div
                className="perk-cards"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "8px",
                }}
              >
                {rewardOptions.map((opt, idx) => {
                  const perkRarity = opt.kind === "perk" ? getPerkRarityById(opt.id) : "common";
                  const rarityClass =
                    opt.kind === "mutation"
                      ? "mutation-card"
                      : opt.kind === "perk"
                        ? perkRarity === "epic"
                          ? "epic"
                          : perkRarity === "rare"
                            ? "rare"
                            : "common"
                        : opt.kind === "bomb"
                          ? "epic"
                          : "common";
                  return (
                    <button
                      key={`${opt.kind}-${opt.id}-${idx}`}
                      className={`perk-card ${rarityClass} text-left`}
                      style={{
                        width: "100%",
                        minHeight: "unset",
                        padding: "10px",
                      }}
                      onClick={() => handleRewardSelect(opt)}
                    >
                      <h3 className="text-xs">
                        {opt.title ?? REWARD_LABELS[opt.id] ?? opt.id}
                      </h3>
                      <p className="text-xs">
                        {opt.description ?? "Récompense tactique immédiate."}
                      </p>
                      <span className="perk-rarity">{opt.kind.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="perks-panel text-left" style={{ maxHeight: "none" }}>
              <p className="perks-empty">Prochaine sélection à {nextRewardAt} lignes.</p>
            </div>
          )}
        </div>

        <TetrisBoard
          mode="ROGUELIKE_VERSUS"
          scoreMode={null}
          rng={playerRng}
          incomingGarbage={playerIncomingGarbage}
          onGarbageConsumed={() => setPlayerIncomingGarbage(0)}
          onConsumeLines={(lines) => {
            const garbage = Math.max(0, VERSUS_GARBAGE_MAP[lines] ?? 0);
            linesSentRef.current += lines;
            if (garbage > 0) pushGarbageToBot(garbage);
          }}
          onLinesCleared={(linesCleared) => {
            if (linesCleared > 0) {
              playerAggressionScoreRef.current = Math.max(
                0,
                playerAggressionScoreRef.current * 0.84
              );
              playerLiveLinesRef.current += linesCleared;
              comboStreakRef.current += linesCleared;
              playerAggressionScoreRef.current += linesCleared * 2;
              maxComboRef.current = Math.max(maxComboRef.current, comboStreakRef.current);
              if (
                comboStreakRef.current >= ADAPTIVE.comboSpam.minComboStreak &&
                !comboSpamAnnouncedRef.current
              ) {
                if (
                  playerAggressionScoreRef.current >= ADAPTIVE.comboSpam.minAggression &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.comboSpam.minMatchMs,
                    minLines: ADAPTIVE.comboSpam.minLines,
                  })
                ) {
                  comboSpamAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_combo_spam" });
                }
              }
              if (comboStreakRef.current >= 2) {
                comboSampleCountRef.current += 1;
                comboValueSumRef.current += comboStreakRef.current;
              }
            } else {
              playerAggressionScoreRef.current *= 0.78;
              comboStreakRef.current = 0;
            }
            if (linesCleared === 4) {
              tetrisCountRef.current += 1;
              playerAggressionScoreRef.current += 4;
              emitBotEvent({ type: "player_tetris" });
            }
            setCurrentLines((v) => v + linesCleared);
            setTotalLines((prev) => {
              const nextTotal = prev + linesCleared;
              if (!selectingReward && nextTotal >= nextRewardAt) {
                setRewardOptions(buildRewardOptions());
                setSelectingReward(true);
                setRewardDeadline(Date.now() + 10_000);
                setNextRewardAt((v) => v + REWARD_INTERVAL_LINES);
              }
              return nextTotal;
            });
          }}
          onBoardUpdate={(board) => {
            playerBoardRef.current = board;
            const now = Date.now();
            const previousTs = lastBoardSampleAtRef.current;
            if (previousTs !== null && inRedZoneRef.current) {
              redZoneTimeMsRef.current += Math.max(0, now - previousTs);
            }
            lastBoardSampleAtRef.current = now;
            const rows = board.length;
            let topFilled = rows;
            for (let y = 0; y < rows; y += 1) {
              if (board[y].some((cell) => cell !== 0)) {
                topFilled = y;
                break;
              }
            }
            const height = rows - topFilled;
            maxStackHeightRef.current = Math.max(maxStackHeightRef.current, height);
            playerStackSumRef.current += height;
            playerStackSamplesRef.current += 1;
            inRedZoneRef.current = height >= RED_ZONE_HEIGHT;
            if (height >= RED_ZONE_HEIGHT) {
              emitBotEvent({ type: "player_high_stack" });
              if (!highRiskAnnouncedRef.current) {
                const botHeight = botBoardRef.current ? getStackHeight(botBoardRef.current) : 0;
                const bothNearDanger =
                  height >= RED_ZONE_HEIGHT &&
                  botHeight >= RED_ZONE_HEIGHT - ADAPTIVE.highRisk.botDangerBuffer;
                if (
                  bothNearDanger &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.highRisk.minMatchMs,
                    minLines: ADAPTIVE.highRisk.minLines,
                  })
                ) {
                  highRiskAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_high_risk" });
                }
              }
            }
          }}
          onLocalGameOver={(score, lines) => {
            const now = Date.now();
            if (lastBoardSampleAtRef.current !== null && inRedZoneRef.current) {
              redZoneTimeMsRef.current += Math.max(0, now - lastBoardSampleAtRef.current);
            }
            lastBoardSampleAtRef.current = now;
            setPlayerResult({ score: score + playerBombBonusRef.current, lines });
            if (startTimeRef.current) runDurationRef.current = Date.now() - startTimeRef.current;
          }}
          hideGameOverOverlay
          paused={matchOver}
          onGameStart={() => {
            resetRunTracking();
            startTimeRef.current = Date.now();
            setRewardOptions(buildRewardOptions());
            setSelectingReward(true);
            setRewardDeadline(Date.now() + 10_000);
            if (!matchStartAnnouncedRef.current) {
              matchStartAnnouncedRef.current = true;
              emitBotEvent({ type: "match_start" }, true);
            }
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
          onScoreChange={(score) => {
            const rounded = Math.round(score);
            playerLiveScoreRef.current = rounded;
            setCurrentScore(rounded);
            maybeEmitComeback();
            const now = Date.now();
            if (now - lastTrollAtRef.current >= MEMORY_TIMING.trollCooldownMs) {
              const troll = getScoreTrollDialogue(
                botPersonality,
                playerLiveScoreRef.current + playerBombBonusRef.current,
                botLiveScoreRef.current + botBombBonusRef.current
              );
              if (troll) {
                emitCustomBotLine(
                  troll,
                  botPersonality.id === "apex" ? "evil" : "thinking"
                );
                lastTrollAtRef.current = now;
              }
            }
          }}
          gravityMultiplier={effectiveGravityMultiplier}
          scoreMultiplier={effectiveScoreMultiplier}
          extraHold={extraHoldSlots}
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
          disableBombKey
          externalBoardEdits={playerExternalBombEdits}
          externalBoardEditToken={playerExternalBombToken}
        />

        <div className="flex flex-col gap-2 items-center">
          <p className="text-xs text-gray-300 mb-2">Grille Tetrobots</p>
          <TetrobotsAvatar mood={botMood} personalityId={botPersonality.id} />
          <div style={{ height: 16, width: "100%" }} />
          <div className="mb-4">
            <OpponentBoard board={botBoard} />
          </div>
          {botMessage && (
            <>
              <div style={{ height: 16, width: "100%" }} />
              <BotSpeechBubble
                message={botMessage}
                speaker={botPersonality.name}
                accentColor={botBubbleAccent}
              />
            </>
          )}
          <div
            style={{
              marginTop: "8px",
              width: "100%",
              maxWidth: "260px",
              background: "rgba(10, 10, 15, 0.75)",
              border: "1px solid #2a2a3d",
              borderRadius: "10px",
              padding: "10px",
              textAlign: "left",
            }}
          >
            <p className="text-xs text-yellow-300 mb-2">Perks actifs du bot</p>
            <p className="text-xs text-cyan-300 mb-1">Bombes bot: {botBombCharges}</p>
            <p className="text-xs text-cyan-300 mb-2">Bonus bombes: +{botBombBonusScore}</p>
            {botActivePerks.length === 0 ? (
              <p className="text-xs text-gray-400">Aucun perk actif</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {botActivePerks.map((perkId) => {
                  const perk = RV_PERKS.find((p) => p.id === perkId);
                  const rarity = perk?.rarity ?? "common";
                  const rarityColor =
                    rarity === "epic" ? "#ff4fd8" : rarity === "rare" ? "#00ffd5" : "#9ca3af";
                  return (
                    <span
                      key={perkId}
                      className="text-[10px]"
                      style={{
                        border: `1px solid ${rarityColor}`,
                        borderRadius: "999px",
                        padding: "4px 8px",
                        color: "#e5e7eb",
                        background: "rgba(12, 12, 18, 0.9)",
                      }}
                    >
                      {perk?.name ?? perkId}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }}>
        <TetrisBoard
          mode="ROGUELIKE_VERSUS"
          scoreMode={null}
          rng={botRng}
          keyboardControlsEnabled={false}
          tetrobotsPersonalityId={botPersonalityId}
          tetrobotsAdaptiveContext={{
            playerAvgStackHeight:
              playerStackSamplesRef.current > 0
                ? playerStackSumRef.current / playerStackSamplesRef.current
                : 0,
            playerAggressionScore: playerAggressionScoreRef.current,
          }}
          incomingGarbage={botIncomingGarbage}
          onGarbageConsumed={() => setBotIncomingGarbage(0)}
          onConsumeLines={(lines) => {
            const garbage = Math.max(0, VERSUS_GARBAGE_MAP[lines] ?? 0);
            if (garbage > 0) pushGarbageToPlayer(garbage);
          }}
          onLinesCleared={(linesCleared) => {
            if (linesCleared > 0) {
              botLiveLinesRef.current += linesCleared;
              if (linesCleared === 4) emitBotEvent({ type: "bot_tetris" });
            }
          }}
          onTetrobotsPlan={({ isBlunder, strategy }) => {
            if (isBlunder) {
              botBlunderRef.current = true;
              emitBotEvent({ type: "bot_blunder" });
              if (botStrategyRef.current !== "neutral") {
                if (
                  botStrategyShiftCountRef.current >= ADAPTIVE.failedAdaptation.minStrategyShifts &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.failedAdaptation.minMatchMs,
                    minLines: ADAPTIVE.failedAdaptation.minLines,
                  })
                ) {
                  emitBotEvent({ type: "bot_failed_adaptation" });
                }
              }
            }
            if (botStrategyRef.current !== strategy) {
              const previousStrategy = botStrategyRef.current;
              botStrategyRef.current = strategy;
              botStrategyShiftCountRef.current += 1;
              if (
                canEmitAdaptiveEvent({
                  minMatchMs: ADAPTIVE.strategyShift.minMatchMs,
                  minLines: ADAPTIVE.strategyShift.minLines,
                })
              ) {
                emitBotEvent({ type: "bot_strategy_shift", from: previousStrategy, to: strategy });
              }
              if (strategy === "panic") {
                if (
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.panicMode.minMatchMs,
                    minLines: ADAPTIVE.panicMode.minLines,
                    minIntervalMs: ADAPTIVE.panicMode.minIntervalMs,
                  })
                ) {
                  emitBotEvent({ type: "bot_panic_mode" });
                }
              } else if (previousStrategy === "panic") {
                if (
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.recovered.minMatchMs,
                    minLines: ADAPTIVE.recovered.minLines,
                    minIntervalMs: ADAPTIVE.recovered.minIntervalMs,
                  })
                ) {
                  emitBotEvent({ type: "bot_recovered" });
                }
              }
              if (strategy === "defensive" && !aggressiveDetectAnnouncedRef.current) {
                if (
                  playerAggressionScoreRef.current >= ADAPTIVE.detectAggressive.minAggression &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.detectAggressive.minMatchMs,
                    minLines: ADAPTIVE.detectAggressive.minLines,
                  })
                ) {
                  aggressiveDetectAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_aggressive_player" });
                }
              }
              if (strategy === "aggressive" && !defensiveDetectAnnouncedRef.current) {
                const avgHeight =
                  playerStackSamplesRef.current > 0
                    ? playerStackSumRef.current / playerStackSamplesRef.current
                    : 0;
                if (
                  avgHeight <= ADAPTIVE.detectDefensive.maxAvgHeight &&
                  playerAggressionScoreRef.current <= ADAPTIVE.detectDefensive.maxAggression &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.detectDefensive.minMatchMs,
                    minLines: ADAPTIVE.detectDefensive.minLines,
                  })
                ) {
                  defensiveDetectAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_defensive_player" });
                }
              }
              if (strategy === "pressure" && !exploitingPatternAnnouncedRef.current) {
                if (
                  botStrategyShiftCountRef.current >= ADAPTIVE.exploitPattern.minStrategyShifts &&
                  playerStackSamplesRef.current >= ADAPTIVE.exploitPattern.minSamples &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.exploitPattern.minMatchMs,
                    minLines: ADAPTIVE.exploitPattern.minLines,
                  })
                ) {
                  exploitingPatternAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_exploiting_player_pattern" });
                }
              }
              if (
                botStrategyShiftCountRef.current >= ADAPTIVE.analysisComplete.minStrategyShifts &&
                !analysisCompleteAnnouncedRef.current &&
                canEmitAdaptiveEvent({
                  minMatchMs: ADAPTIVE.analysisComplete.minMatchMs,
                  minLines: ADAPTIVE.analysisComplete.minLines,
                  minIntervalMs: ADAPTIVE.analysisComplete.minIntervalMs,
                })
              ) {
                analysisCompleteAnnouncedRef.current = true;
                emitBotEvent({ type: "bot_analysis_complete" });
              }
            }
          }}
          onBoardUpdate={(board) => {
            setBotBoard(board);
            botBoardRef.current = board;
          }}
          onScoreChange={(score) => {
            botLiveScoreRef.current = Math.round(score);
            maybeEmitComeback();
            const now = Date.now();
            if (now - lastTrollAtRef.current >= MEMORY_TIMING.trollCooldownMs) {
              const troll = getScoreTrollDialogue(
                botPersonality,
                playerLiveScoreRef.current + playerBombBonusRef.current,
                botLiveScoreRef.current + botBombBonusRef.current
              );
              if (troll) {
                emitCustomBotLine(
                  troll,
                  botPersonality.id === "apex" ? "evil" : "thinking"
                );
                lastTrollAtRef.current = now;
              }
            }
          }}
          onLocalGameOver={(score, lines) => {
            setBotResult({ score: score + botBombBonusRef.current, lines });
          }}
          hideGameOverOverlay
          paused={matchOver}
          chaosMode={botChaosActive}
          scoreMultiplier={botScoreMultiplier}
          gravityMultiplier={botGravityMultiplier}
          extraHold={botExtraHold}
          disableBombKey
          externalBoardEdits={botExternalBombEdits}
          externalBoardEditToken={botExternalBombToken}
        />
      </div>

      <FullScreenOverlay show={matchOver}>
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
          <p>Toi : {myScore} pts / {myLines} lignes</p>
          <p>Tetrobots : {enemyScore} pts / {enemyLines} lignes</p>
          <p className="text-cyan-300">
            {myScore > enemyScore ? "Victoire" : myScore < enemyScore ? "Défaite" : "Égalité"}
          </p>
          <div className="flex gap-4 mt-2">
            <button className="retro-btn" onClick={startMatch}>
              Rejouer
            </button>
            <button className="retro-btn" onClick={backToLobby}>
              Retour lobby
            </button>
          </div>
        </div>
      </FullScreenOverlay>
    </div>
  );
}

export default function RoguelikeVersus() {
  const [searchParams] = useSearchParams();
  const queue = (searchParams.get("queue") ?? "pvp").toLowerCase();

  if (queue === "bot") {
    return <RoguelikeVersusTetrobots />;
  }

  return <RoguelikeVersusPvp />;
}
