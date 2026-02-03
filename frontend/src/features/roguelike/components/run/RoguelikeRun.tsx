import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TetrisBoard from "../../../game/components/board/TetrisBoard";
import type { Perk } from "../../types/Perk";
import type { Mutation } from "../../types/Mutation";
import type { MutationContext } from "../../types/MutationContext";
import { applyPerk } from "../../logic/applyPerk";
import { useRoguelikeRun } from "../../hooks/useRoguelikeRun";
import RoguelikeRunSummary from "./RoguelikeRunSummary";
import { useNavigate } from "react-router-dom";
import { createRng } from "../../../../shared/utils/rng";
import { SYNERGIES } from "../../data/synergies";
import { useActiveSynergies } from "../../hooks/useActiveSynergies";
import { useAchievements } from "../../../achievements/hooks/useAchievements";
import AchievementToast from "../../../achievements/components/AchievementToast";
import { applyTimeFreezeDurationFromPerk } from "../../utils/timeFreeze";
import { useAutoClearRecentAchievements } from "../../hooks/useAutoClearRecentAchievements";
import { useRoguelikeStatsTracking } from "../../hooks/useRoguelikeStatsTracking";
import { useRoguelikeRunStart } from "../../hooks/useRoguelikeRunStart";
import { useRoguelikeSelection } from "../../hooks/useRoguelikeSelection";
import { usePerkExpiry } from "../../hooks/usePerkExpiry";
import { useSynergyToast } from "../../hooks/useSynergyToast";
import { useTimeFreeze } from "../../hooks/useTimeFreeze";
import { useTimeFreezeState } from "../../hooks/useTimeFreezeState";
import {
  buildStatusBadges,
  clampGravityMultiplier,
  getEffectiveGravityMultiplier,
  getEffectiveScoreMultiplier,
} from "../../utils/runCalculations";
import SelectionOverlays from "./ui/SelectionOverlays";
import SidebarLeft from "./ui/SidebarLeft";
import SidebarRight from "./ui/SidebarRight";
import PauseOverlay from "./ui/PauseOverlay";
import SynergyToast from "./ui/SynergyToast";

export type ActivePerkRuntime = Perk & {
  startedAt?: number;
  expiresAt?: number;
  pending?: boolean;
};

export type ActiveMutationRuntime = Mutation & {
  stacks: number;
};

export default function RoguelikeRun({
  initialSeed,
  seededMode = false,
}: {
  initialSeed?: string;
  seededMode?: boolean;
}) {
  const [selectingPerk, setSelectingPerk] = useState(true);
  const [selectionType, setSelectionType] = useState<"perk" | "mutation">("perk");
  const [gravityMultiplier, setGravityMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [perkChoices, setPerkChoices] = useState<Perk[]>([]);
  const [mutationChoices, setMutationChoices] = useState<Mutation[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [secondChance, setSecondChance] = useState(false);
  const [usedSecondChance, setUsedSecondChance] = useState(false);
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
  const [chaosMode, setChaosMode] = useState(false);
  const [chaosDrift, setChaosDrift] = useState(false);
  const [pieceMutation, setPieceMutation] = useState(false);
  const [bombRadius, setBombRadius] = useState(1); // 1 = 3x3
  const [bombs, setBombs] = useState(0);
  const [bombsUsed, setBombsUsed] = useState(0);
  const [bombsGranted, setBombsGranted] = useState(0);
  const [activePerks, setActivePerks] = useState<ActivePerkRuntime[]>([]);
  const [activeMutations, setActiveMutations] = useState<ActiveMutationRuntime[]>([]);
  const [fastHoldReset, setFastHoldReset] = useState(false);
  const [hardDropHoldReset, setHardDropHoldReset] = useState(false);
  const [lastStand, setLastStand] = useState(false);
  const [chainExplosions, setChainExplosions] = useState(false);
  const [lineSlowEnabled, setLineSlowEnabled] = useState(false);
  const [lineSlowActive, setLineSlowActive] = useState(false);
  const lineSlowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zeroBombBoost, setZeroBombBoost] = useState(false);
  const [noBombBonus, setNoBombBonus] = useState(false);
  const [secondChanceRechargeEvery, setSecondChanceRechargeEvery] = useState<number | null>(null);
  const [rotationDelayMs, setRotationDelayMs] = useState(0);
  const [runEnded, setRunEnded] = useState(false);
  const [nextChoiceAt, setNextChoiceAt] = useState(10);
  const [totalLines, setTotalLines] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const navigate = useNavigate();
  const [summaryPerks, setSummaryPerks] = useState<ActivePerkRuntime[]>([]);
  const [summaryMutations, setSummaryMutations] = useState<ActiveMutationRuntime[]>([]);
  const [summaryScore, setSummaryScore] = useState(0);
  const [summaryLines, setSummaryLines] = useState(0);
  const [summaryLevel, setSummaryLevel] = useState(1);
  const rngRef = useRef<(() => number) | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const runStartedRef = useRef(false);
  const [manualPause, setManualPause] = useState(false);
  const [autoSeededMode, setAutoSeededMode] = useState(seededMode);
  const { checkAchievements, registerRun, updateStats, recentUnlocks, clearRecent } =
    useAchievements();
  const {
    startTimeRef,
    holdCountRef,
    hardDropCountRef,
    comboStreakRef,
    maxComboRef,
    lineClearTotalsRef,
    tetrisCleared,
    setTetrisCleared,
    resetLineClears,
    resetRunTracking,
    handleLinesCleared,
    noteTetrisCleared,
    onHold,
    onHardDrop,
  } = useRoguelikeStatsTracking();
  useAutoClearRecentAchievements(recentUnlocks, clearRecent);

  const countTrue = useCallback(
    (values: Record<string, boolean>) => Object.values(values).filter(Boolean).length,
    []
  );
  const setSafeGravityMultiplier = useCallback(
    (next: number | ((prev: number) => number)) => {
      setGravityMultiplier((prev) => {
        const computed = typeof next === "function" ? next(prev) : next;
        return clampGravityMultiplier(computed);
      });
    },
    []
  );

  useEffect(() => {
    setAutoSeededMode(seededMode);
  }, [seededMode]);
  const grantBombs = useCallback((count: number = 1) => {
    if (count === 0) return;
    setBombs((v) => v + count);
    setBombsGranted((v) => v + count);
  }, []);
  const resetLocalState = useCallback(() => {
    resetLineClears();
    setActivePerks([]);
    setActiveMutations([]);
    setSelectionType("perk");
    setCurrentScore(0);
    setCurrentLevel(1);
    setTotalLines(0);
    setNextChoiceAt(10);
    setPerkChoices([]);
    setMutationChoices([]);
    setGravityMultiplier(1);
    setScoreMultiplier(1);
    setExtraHoldSlots(0);
    setBombRadius(1);
    setSecondChance(false);
    setUsedSecondChance(false);
    setBombs(0);
    setBombsUsed(0);
    setBombsGranted(0);
    resetTimeFreezeState();
    setChaosMode(false);
    setChaosDrift(false);
    setPieceMutation(false);
    setFastHoldReset(false);
    setHardDropHoldReset(false);
    setLastStand(false);
    setChainExplosions(false);
    setLineSlowEnabled(false);
    setLineSlowActive(false);
    setZeroBombBoost(false);
    setNoBombBonus(false);
    setSecondChanceRechargeEvery(null);
    setRotationDelayMs(0);
    setTimeFrozen(false);
    if (lineSlowTimeoutRef.current) {
      clearTimeout(lineSlowTimeoutRef.current);
      lineSlowTimeoutRef.current = null;
    }
    setManualPause(false);
    setRunEnded(false);
    setSelectingPerk(true);
    setShowSummary(false);
    setTetrisCleared(false);
    setBoardKey((k) => k + 1);
    runStartedRef.current = false;
  }, [resetLineClears]);
  const linesUntilNextChoice = Math.max(0, nextChoiceAt - totalLines);
  const perkProgress = selectingPerk ? 1 : 1 - linesUntilNextChoice / 10;
  const activeSynergies = useActiveSynergies(activePerks, SYNERGIES);
  const effectiveGravityMultiplier = getEffectiveGravityMultiplier({
    gravityMultiplier,
    lineSlowActive,
    currentLevel,
  });
  const effectiveScoreMultiplier = getEffectiveScoreMultiplier({
    scoreMultiplier,
    zeroBombBoost,
    bombs,
  });
  const statusBadges = useMemo(
    () =>
      buildStatusBadges({
        effectiveScoreMultiplier,
        effectiveGravityMultiplier,
        bombs,
        timeFreezeCharges,
        chaosMode,
        zeroBombBoost,
        noBombBonus,
        bombsUsed,
        chainExplosions,
        lineSlowEnabled,
        lineSlowActive,
        secondChance,
        secondChanceRechargeEvery,
        rotationDelayMs,
        timeFreezeEcho,
      }),
    [
      effectiveScoreMultiplier,
      effectiveGravityMultiplier,
      bombs,
      timeFreezeCharges,
      chaosMode,
      zeroBombBoost,
      noBombBonus,
      bombsUsed,
      chainExplosions,
      lineSlowEnabled,
      lineSlowActive,
      secondChance,
      secondChanceRechargeEvery,
      rotationDelayMs,
      timeFreezeEcho,
    ]
  );
  useEffect(() => {
    if (!lineSlowEnabled) setLineSlowActive(false);
  }, [lineSlowEnabled]);
  useEffect(() => {
    if (selectingPerk) return;
    setSelectionType(currentLevel >= 12 ? "mutation" : "perk");
  }, [currentLevel, selectingPerk]);

  useEffect(() => {
    if (!secondChanceRechargeEvery) return;
    if (currentLevel > 1 && currentLevel % secondChanceRechargeEvery === 0) {
      setSecondChance(true);
    }
  }, [currentLevel, secondChanceRechargeEvery]);

  const consumeSecondChance = () => {
    setSecondChance(false);
    setUsedSecondChance(true);
    setActivePerks((prev) => prev.filter((p) => p.id !== "second-chance"));
  };

  const { run, startRun, checkpoint, finishRun, hasActiveRun } = useRoguelikeRun();

  const handleConsumeLines = (linesCleared: number) => {
    setTotalLines((prev) => {
      const newTotal = prev + linesCleared;
      const nextLevel = Math.floor(newTotal / 10) + 1;

      if (linesCleared === 4) {
        noteTetrisCleared();
      }

      if (lineSlowEnabled && linesCleared > 0) {
        setLineSlowActive(true);
        if (lineSlowTimeoutRef.current) {
          clearTimeout(lineSlowTimeoutRef.current);
        }
        lineSlowTimeoutRef.current = setTimeout(() => setLineSlowActive(false), 2500);
      }

      if (newTotal >= nextChoiceAt) {
        setSelectionType(nextLevel >= 12 ? "mutation" : "perk");
        setSelectingPerk(true);
        setPerkChoices([]);
        setMutationChoices([]);
        setNextChoiceAt(nextChoiceAt + 10);

        checkpoint({
          score: currentScore,
          lines: newTotal,
          level: currentLevel,
          perks: activePerks.map((p) => p.id),
          mutations: activeMutations.map((mutation) => ({
            id: mutation.id,
            stacks: mutation.stacks,
          })),
          lineClears: { ...lineClearTotalsRef.current },
          bombs,
          bombsUsed,
          timeFreezeCharges,
          chaosMode,
          gravityMultiplier,
          scoreMultiplier,
        });
      }

      return newTotal;
    });
  };

  const handleSelectPerk = (perk: Perk) => {
    const isTimeFreeze = perk.id === "time-freeze";

    applyPerk(perk, {
      addHoldSlot: () => setExtraHoldSlots((v) => v + 1),

      slowGravity: (factor = 1.5) => setSafeGravityMultiplier((v) => v * factor),

      addBomb: (count = 1) => grantBombs(count),

      addScoreBoost: (value = 0.5) => setScoreMultiplier((v) => v + value),

      grantSecondChance: () => setSecondChance(true),

      addTimeFreeze: (count = 1) => setTimeFreezeCharges((v) => v + count),

      enableChaosMode: () => setChaosMode(true),

      setBombRadius: (radius: number) => setBombRadius(radius),

      enableFastHoldReset: () => setFastHoldReset(true),
      enableLastStand: () => setLastStand(true),
    });

    setRunEnded(false);
    if (isTimeFreeze) {
      applyTimeFreezeDurationFromPerk(perk, setTimeFreezeDurationSafe);
    }

    setActivePerks((prev) => [
      ...prev,
      {
        ...perk,
        startedAt: isTimeFreeze ? undefined : Date.now(),
        expiresAt:
          !isTimeFreeze && perk.durationMs ? Date.now() + perk.durationMs : undefined,
        pending: isTimeFreeze,
      },
    ]);

    setSelectingPerk(false);
  };

  const handleSelectMutation = (mutation: Mutation) => {
    const existing = activeMutations.find((m) => m.id === mutation.id);
    const maxStacks = mutation.maxStacks ?? Number.POSITIVE_INFINITY;
    if (existing && (mutation.unique || (mutation.stackable && existing.stacks >= maxStacks))) {
      setSelectingPerk(false);
      return;
    }

    const ctx: MutationContext = {
      addBomb: (count = 1) => grantBombs(count),
      setBombRadius: (fn) => setBombRadius((v) => fn(v)),
      enableChainExplosions: () => setChainExplosions(true),
      setGravityMultiplier: (fn) => setSafeGravityMultiplier((v) => fn(v)),
      addTimeFreezeOnUse: () => setTimeFreezeEcho(true),
      enableLineSlow: () => setLineSlowEnabled(true),
      setScoreMultiplier: (fn) => setScoreMultiplier((v) => fn(v)),
      enableNoBombBonus: () => setNoBombBonus(true),
      enableZeroBombBoost: () => setZeroBombBoost(true),
      setRotationSpeed: (value) => {
        const delay = Math.max(0, Math.round((1 - value) * 200));
        setRotationDelayMs(delay);
      },
      enableHardDropHoldReset: () => setHardDropHoldReset(true),
      enableChaosDrift: () => setChaosDrift(true),
      enablePieceMutation: () => setPieceMutation(true),
      enableSecondChanceRecharge: (everyLevels) => setSecondChanceRechargeEvery(everyLevels),
    };

    mutation.apply(ctx);
    setRunEnded(false);

    setActiveMutations((prev) => {
      const current = prev.find((m) => m.id === mutation.id);
      if (!current) return [...prev, { ...mutation, stacks: 1 }];
      const newStacks = mutation.stackable
        ? Math.min(current.stacks + 1, mutation.maxStacks ?? current.stacks + 1)
        : current.stacks;
      return prev.map((m) => (m.id === mutation.id ? { ...m, stacks: newStacks } : m));
    });

    setSelectingPerk(false);
  };

  const { triggerTimeFreeze } = useTimeFreeze({
    timeFreezeCharges,
    timeFrozen,
    timeFreezeDuration,
    timeFreezeEcho,
    setTimeFreezeCharges,
    setTimeFrozen,
    setActivePerks,
  });

  const handleBombUsed = () => {
    setBombsUsed((v) => v + 1);
    if (chainExplosions) {
      const rng = rngRef.current ?? Math.random;
      if (rng() < 0.35) {
        setBombsGranted((v) => v + 1);
      }
    }
  };

  useRoguelikeRunStart({
    hasActiveRun,
    runEnded,
    runStartedRef,
    initialSeed,
    startRun,
    gravityMultiplier,
    scoreMultiplier,
    bombs,
    timeFreezeCharges,
    setAutoSeededMode,
    setBoardKey,
  });

  // ▶️ Init RNG déterministe quand le seed est dispo
  useEffect(() => {
    if (run?.seed) {
      rngRef.current = createRng(run.seed);
    } else {
      rngRef.current = null;
    }
  }, [run?.seed]);

  usePerkExpiry({ selectingPerk, setActivePerks });

  const { synergyToast } = useSynergyToast({
    activePerks,
    setGravityMultiplier: setSafeGravityMultiplier,
    setScoreMultiplier,
    setChaosMode,
    setTimeFreezeDurationSafe,
    addBomb: grantBombs,
    setBombRadius,
  });

  useRoguelikeSelection({
    selectingPerk,
    selectionType,
    activePerks,
    activeMutations,
    autoSeededMode,
    rngRef,
    perkChoices,
    mutationChoices,
    setPerkChoices,
    setMutationChoices,
    setSelectingPerk,
    onSelectPerk: handleSelectPerk,
    onSelectMutation: handleSelectMutation,
  });

  useEffect(() => {
    setChaosMode(activePerks.some((p) => p.id === "chaos-mode"));
  }, [activePerks]);

  useEffect(() => {
    return () => {
      if (lineSlowTimeoutRef.current) {
        clearTimeout(lineSlowTimeoutRef.current);
      }
    };
  }, []);

  const isDevilSeed = run?.seed?.toUpperCase() === "DEVIL-666";

  return (
    <div className="rogue-run">
      <SynergyToast synergy={synergyToast} />
      <SelectionOverlays
        selectingPerk={selectingPerk}
        selectionType={selectionType}
        autoSeededMode={autoSeededMode}
        perkChoices={perkChoices}
        mutationChoices={mutationChoices}
        onSelectPerk={handleSelectPerk}
        onSelectMutation={handleSelectMutation}
      />
      <SidebarLeft
        linesUntilNextChoice={linesUntilNextChoice}
        perkProgress={perkProgress}
        selectionType={selectionType}
        statusBadges={statusBadges}
        activePerks={activePerks}
        activeMutations={activeMutations}
        activeSynergies={activeSynergies}
        selectingPerk={selectingPerk}
      />

      <main className="rogue-center">
        <TetrisBoard
          key={boardKey}
          mode="ROGUELIKE"
          hideGameOverOverlay={true}
          paused={selectingPerk || showSummary || manualPause}
          autoStart={!selectingPerk}
          gravityMultiplier={effectiveGravityMultiplier}
          cursedMode={isDevilSeed}
          extraHold={extraHoldSlots}
          bombsGranted={bombsGranted}
          scoreMultiplier={effectiveScoreMultiplier}
          secondChance={secondChance}
          onConsumeSecondChance={consumeSecondChance}
          timeFrozen={timeFrozen}
          onTriggerTimeFreeze={triggerTimeFreeze}
          timeFreezeCharges={timeFreezeCharges}
          fastHoldReset={fastHoldReset}
          hardDropHoldReset={hardDropHoldReset}
          lastStand={lastStand}
          rotationDelayMs={rotationDelayMs}
          onScoreChange={setCurrentScore}
          onLevelChange={setCurrentLevel}
          onConsumeLines={handleConsumeLines}
          onLinesCleared={handleLinesCleared}
          chaosMode={chaosMode}
          chaosDrift={chaosDrift}
          pieceMutation={pieceMutation}
          bombRadius={bombRadius}
          rng={rngRef.current ?? undefined}
          onBombsChange={setBombs}
          onBombUsed={handleBombUsed}
          onGameStart={() => {
            resetRunTracking();
            startTimeRef.current = Date.now();
          }}
          onHold={onHold}
          onHardDrop={onHardDrop}
          onLocalGameOver={async (score, lines) => {
            if (!run) return;
            const finalScore = noBombBonus && bombsUsed === 0 ? Math.floor(score * 2) : score;
            const safeScore = Math.round(finalScore);
            const safeLines = Math.round(lines);
            const safeLevel = Math.max(1, Math.round(currentLevel));

            const { runsPlayed, sameSeedRuns } = registerRun(run.seed);
            const durationMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
            const noHold = holdCountRef.current === 0;
            const noHardDrop = hardDropCountRef.current === 0;
            let sameScoreTwice = false;
            const next = updateStats((prev) => {
              sameScoreTwice = prev.lastScore !== null && prev.lastScore === safeScore;
              return {
                ...prev,
                scoredModes: {
                  ...prev.scoredModes,
                  ROGUELIKE: safeScore > 0 ? true : prev.scoredModes.ROGUELIKE,
                },
                level10Modes: {
                  ...prev.level10Modes,
                  ROGUELIKE: safeLevel >= 10 ? true : prev.level10Modes.ROGUELIKE,
                },
                playtimeMs: prev.playtimeMs + durationMs,
                noHoldRuns: prev.noHoldRuns + (noHold ? 1 : 0),
                hardDropCount: prev.hardDropCount + hardDropCountRef.current,
                lastScore: safeScore,
              };
            });
            checkAchievements({
              score: safeScore,
              lines: safeLines,
              level: safeLevel,
              mode: "ROGUELIKE",
              bombsUsed,
              usedSecondChance,
              perks: activePerks.map(p => p.id),
              synergies: activeSynergies.map(s => s.id),
              mutations: activeMutations.map(m => m.id),
              chaosMode,
              seed: run.seed,
              runsPlayed,
              sameSeedRuns,
              tetrisCleared,
              custom: {
                combo_5: maxComboRef.current >= 5,
                no_hold_runs_10: next.noHoldRuns >= 10,
                harddrop_50: next.hardDropCount >= 50,
                no_harddrop_10_min: durationMs >= 10 * 60 * 1000 && noHardDrop,
                playtime_60m: next.playtimeMs >= 60 * 60 * 1000,
                playtime_300m: next.playtimeMs >= 300 * 60 * 1000,
                level_10_three_modes: countTrue(next.level10Modes) >= 3,
                scored_all_modes: countTrue(next.scoredModes) >= 4,
                modes_visited_all: countTrue(next.modesVisited) >= 4,
                same_score_twice: sameScoreTwice,
              },
            });

            // 🧊 SNAPSHOT AVANT RESET
            setSummaryPerks([...activePerks]);
            setSummaryMutations([...activeMutations]);
            setSummaryScore(safeScore);
            setSummaryLines(safeLines);
            setSummaryLevel(safeLevel);

            setRunEnded(true);
            setSelectingPerk(false);
            setShowSummary(true);

            try {
            await checkpoint({
              score: safeScore,
              lines: safeLines,
              level: safeLevel,
              perks: activePerks.map((p) => p.id), // backend OK
              mutations: activeMutations.map((mutation) => ({
                id: mutation.id,
                stacks: mutation.stacks,
              })),
              lineClears: { ...lineClearTotalsRef.current },
              bombs,
              bombsUsed,
              timeFreezeCharges,
              chaosMode,
              gravityMultiplier,
                scoreMultiplier,
              });
            } finally {
              await finishRun("FINISHED");

              // 🔄 reset pour prochaine run
              resetLineClears();
              setActivePerks([]);
              setActiveMutations([]);
              setCurrentScore(0);
              setCurrentLevel(1);
              setTotalLines(0);
              setNextChoiceAt(10);
              setSelectionType("perk");
              setPerkChoices([]);
              setMutationChoices([]);
              setGravityMultiplier(1);
              setScoreMultiplier(1);
              setExtraHoldSlots(0);
              setBombRadius(1);
              setSecondChance(false);
              setUsedSecondChance(false);
              setBombs(0);
              setBombsUsed(0);
              setBombsGranted(0);
            resetTimeFreezeState();
              setChaosMode(false);
              setChaosDrift(false);
              setPieceMutation(false);
              setFastHoldReset(false);
              setHardDropHoldReset(false);
              setLastStand(false);
              setChainExplosions(false);
              setLineSlowEnabled(false);
              setLineSlowActive(false);
              if (lineSlowTimeoutRef.current) {
                clearTimeout(lineSlowTimeoutRef.current);
                lineSlowTimeoutRef.current = null;
              }
              setTetrisCleared(false);
              setZeroBombBoost(false);
              setNoBombBonus(false);
              setSecondChanceRechargeEvery(null);
              setRotationDelayMs(0);
            }
          }}
        />
      </main>

      <SidebarRight
        bombs={bombs}
        timeFreezeCharges={timeFreezeCharges}
        chaosMode={chaosMode}
        paused={manualPause}
        onTogglePause={() => setManualPause((v) => !v)}
      />
      <PauseOverlay show={manualPause && !showSummary} onResume={() => setManualPause(false)} />
      <RoguelikeRunSummary
        visible={showSummary}
        score={summaryScore}
        lines={summaryLines}
        level={summaryLevel}
        perks={summaryPerks}
        mutations={summaryMutations}
        chaosMode={chaosMode}
        seed={run?.seed ?? ""}
        onReplay={async (seed) => {
          resetLocalState();
          rngRef.current = createRng(seed);
          setBoardKey((k) => k + 1);
          runStartedRef.current = true;
          setAutoSeededMode(true);
          await startRun(seed, {
            gravityMultiplier: 1,
            scoreMultiplier: 1,
            bombs: 0,
            timeFreezeCharges: 0,
            chaosMode: false,
            seed,
          });
        }}
        onExit={() => navigate("/dashboard")}
      />
      <AchievementToast
        achievement={recentUnlocks[0] ?? null}
        onClose={clearRecent}
      />
    </div>
  );
}
