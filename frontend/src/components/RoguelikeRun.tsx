import { useCallback, useEffect, useRef, useState } from "react";
import PerksPanel from "./PerksPanel";
import RunInfo from "./RunInfo";
import TetrisBoard from "./TetrisBoard";
import PerkSelectionOverlay from "./PerkSelectionOverlay";
import MutationSelectionOverlay from "./MutationSelectionOverlay";
import type { Perk } from "../types/Perk";
import type { Mutation } from "../types/Mutation";
import type { MutationContext } from "../types/MutationContext";
import { applyPerk } from "./applyPerk";
import { generatePerkChoices } from "../utils/perkRng";
import { generateMutationChoices } from "../utils/mutationRng";
import { ALL_PERKS } from "../data/perks";
import { MUTATIONS } from "../data/mutations";
import type { Synergy } from "../types/Synergy";
import ControlsPanel from "./ControlsPanel";
import { useRoguelikeRun } from "../hooks/useRoguelikeRun";
import RoguelikeRunSummary from "./RoguelikeRunSummary";
import { useNavigate } from "react-router-dom";
import { useSynergies } from "../hooks/useSynergies";
import { createRng } from "../utils/rng";
import { SYNERGIES } from "../data/synergies";
import { useActiveSynergies } from "../hooks/useActiveSynergies";
import SynergiesPanel from "./SynergiesPanel";
import MutationsPanel from "./MutationsPanel";

export type ActivePerkRuntime = Perk & {
  startedAt?: number;
  expiresAt?: number;
  pending?: boolean;
};

export type ActiveMutationRuntime = Mutation & {
  stacks: number;
};

export default function RoguelikeRun() {
  const [selectingPerk, setSelectingPerk] = useState(true);
  const [selectionType, setSelectionType] = useState<"perk" | "mutation">("perk");
  const [gravityMultiplier, setGravityMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [perkChoices, setPerkChoices] = useState<Perk[]>([]);
  const [mutationChoices, setMutationChoices] = useState<Mutation[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [secondChance, setSecondChance] = useState(false);
  const [timeFreezeCharges, setTimeFreezeCharges] = useState(0);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [timeFreezeDuration, setTimeFreezeDuration] = useState(5000);
  const [timeFreezeEcho, setTimeFreezeEcho] = useState(false);
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
  const [synergyToast, setSynergyToast] = useState<Synergy | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synergyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const grantBombs = useCallback((count: number = 1) => {
    if (count === 0) return;
    setBombs((v) => v + count);
    setBombsGranted((v) => v + count);
  }, []);
  const resetLocalState = useCallback(() => {
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
    setBombs(0);
    setBombsUsed(0);
    setBombsGranted(0);
    setTimeFreezeCharges(0);
    setTimeFreezeDuration(5000);
    setTimeFreezeEcho(false);
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
    setSynergyToast(null);
    setTimeFrozen(false);
    if (lineSlowTimeoutRef.current) {
      clearTimeout(lineSlowTimeoutRef.current);
      lineSlowTimeoutRef.current = null;
    }
    setManualPause(false);
    setRunEnded(false);
    setSelectingPerk(true);
    setShowSummary(false);
    setBoardKey((k) => k + 1);
    runStartedRef.current = false;
  }, []);
  const linesUntilNextChoice = Math.max(0, nextChoiceAt - totalLines);
  const perkProgress = selectingPerk ? 1 : 1 - linesUntilNextChoice / 10;
  const activeSynergies = useActiveSynergies(activePerks, SYNERGIES);
  const effectiveGravityMultiplier = gravityMultiplier * (lineSlowActive ? 1.5 : 1);
  const effectiveScoreMultiplier = scoreMultiplier * (zeroBombBoost && bombs === 0 ? 2 : 1);
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
    setActivePerks((prev) => prev.filter((p) => p.id !== "second-chance"));
  };

  const { run, startRun, checkpoint, finishRun, hasActiveRun } = useRoguelikeRun();

  const handleConsumeLines = (linesCleared: number) => {
    setTotalLines((prev) => {
      const newTotal = prev + linesCleared;
      const nextLevel = Math.floor(newTotal / 10) + 1;

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
          bombs,
          timeFreezeCharges,
          chaosMode,
          gravityMultiplier,
          scoreMultiplier,
          seed: "",
        });
      }

      return newTotal;
    });
  };

  const handleSelectPerk = (perk: Perk) => {
    const isTimeFreeze = perk.id === "time-freeze";
    const durationMs = perk.durationMs ?? 5000;

    applyPerk(perk, {
      addHoldSlot: () => setExtraHoldSlots((v) => v + 1),

      slowGravity: (factor = 1.5) => setGravityMultiplier((v) => v * factor),

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
      setTimeFreezeDuration(durationMs);
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
      setGravityMultiplier: (fn) => setGravityMultiplier((v) => fn(v)),
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

  const triggerTimeFreeze = () => {
    if (timeFreezeCharges <= 0 || timeFrozen) return;

    setTimeFreezeCharges((v) => v - 1 + (timeFreezeEcho ? 1 : 0));
    setTimeFrozen(true);

    if (freezeTimeoutRef.current) {
      clearTimeout(freezeTimeoutRef.current);
    }

    const now = Date.now();
    const expiresAt = now + timeFreezeDuration;

    setActivePerks((prev) =>
      prev.map((p) =>
        p.id === "time-freeze" ? { ...p, startedAt: now, expiresAt, pending: false } : p
      )
    );

    freezeTimeoutRef.current = setTimeout(() => {
      setTimeFrozen(false);
    }, timeFreezeDuration);
  };

  const handleBombUsed = () => {
    setBombsUsed((v) => v + 1);
    if (chainExplosions) {
      const rng = rngRef.current ?? Math.random;
      if (rng() < 0.35) {
        setBombsGranted((v) => v + 1);
      }
    }
  };

// ▶️ Démarrage de la run
useEffect(() => {
  if (!hasActiveRun && !runEnded && !runStartedRef.current) {
    runStartedRef.current = true;
    startRun(
      crypto.randomUUID(),
      {
        gravityMultiplier,
        scoreMultiplier,
        bombs,
        timeFreezeCharges,
      }
    );
    setBoardKey((k) => k + 1);
  }
}, [hasActiveRun, runEnded, startRun, gravityMultiplier, scoreMultiplier, bombs, timeFreezeCharges]);

// ▶️ Init RNG déterministe quand le seed est dispo
useEffect(() => {
  if (run?.seed) {
    rngRef.current = createRng(run.seed);
  } else {
    rngRef.current = null;
  }
}, [run?.seed]);

// ▶️ Expiration des perks temporaires
useEffect(() => {
  if (selectingPerk) return;

  const interval = setInterval(() => {
    const now = Date.now();
    setActivePerks(prev =>
      prev.filter(p => !p.expiresAt || p.expiresAt > now)
    );
  }, 250);

  return () => clearInterval(interval);
}, [selectingPerk]);

useSynergies(
  activePerks.map(p => p.id),
  {
    setGravityMultiplier,
    setScoreMultiplier,
    setChaosMode,
    setTimeFreezeDuration,
    addBomb: (n) => grantBombs(n),
    activePerks: activePerks.map(p => p.id),
    setBombRadius,
  },
  (synergy) => {
    setSynergyToast(synergy);
    if (synergyTimeoutRef.current) {
      clearTimeout(synergyTimeoutRef.current);
    }
    synergyTimeoutRef.current = setTimeout(() => setSynergyToast(null), 2500);
  }
);


  useEffect(() => {
    if (!selectingPerk) return;

    const rng = rngRef.current ?? Math.random;

    if (selectionType === "mutation") {
      const choices = generateMutationChoices(MUTATIONS, 3, activeMutations, rng);
      setMutationChoices(choices);
      if (choices.length === 0) {
        setSelectingPerk(false);
      }
    } else {
      setPerkChoices(
        generatePerkChoices(
          ALL_PERKS,
          3,
          activePerks.map((p) => p.id),
          rng
        )
      );
    }
  }, [selectingPerk, selectionType, activePerks, activeMutations]);

  useEffect(() => {
    setChaosMode(activePerks.some((p) => p.id === "chaos-mode"));
  }, [activePerks]);

  useEffect(() => {
    return () => {
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
      }
      if (synergyTimeoutRef.current) {
        clearTimeout(synergyTimeoutRef.current);
      }
      if (lineSlowTimeoutRef.current) {
        clearTimeout(lineSlowTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="rogue-run">
      {synergyToast && (
        <div className="synergy-toast">
          <p className="eyebrow">Synergie activée</p>
          <p className="synergy-name">{synergyToast.name}</p>
          <p className="muted small">{synergyToast.description}</p>
        </div>
      )}
      {selectingPerk && selectionType === "perk" && (
        <PerkSelectionOverlay perks={perkChoices} onSelect={handleSelectPerk} />
      )}
      {selectingPerk && selectionType === "mutation" && (
        <MutationSelectionOverlay mutations={mutationChoices} onSelect={handleSelectMutation} />
      )}
      <aside className="rogue-left">
        <RunInfo
          linesUntilNextPerk={selectingPerk ? 0 : linesUntilNextChoice}
          perkProgress={perkProgress}
          mode={selectionType}
        />
        <div className="perks-wrapper">
          <PerksPanel perks={activePerks} />
          <MutationsPanel mutations={activeMutations} />
          <SynergiesPanel synergies={activeSynergies} />
        </div>
      </aside>

      <main className="rogue-center">
        <TetrisBoard
          key={boardKey}
          mode="ROGUELIKE"
          hideGameOverOverlay={true}
          paused={selectingPerk || showSummary || manualPause}
          autoStart={!selectingPerk}
          gravityMultiplier={effectiveGravityMultiplier}
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
          chaosMode={chaosMode}
          chaosDrift={chaosDrift}
          pieceMutation={pieceMutation}
          bombRadius={bombRadius}
          rng={rngRef.current ?? undefined}
          onBombsChange={setBombs}
          onBombUsed={handleBombUsed}
          onLocalGameOver={async (score, lines) => {
            if (!run) return;
            const finalScore = noBombBonus && bombsUsed === 0 ? Math.floor(score * 2) : score;

            // 🧊 SNAPSHOT AVANT RESET
            setSummaryPerks([...activePerks]);
            setSummaryMutations([...activeMutations]);
            setSummaryScore(finalScore);
            setSummaryLines(lines);
            setSummaryLevel(currentLevel);

            setRunEnded(true);
            setSelectingPerk(false);
            setShowSummary(true);

            try {
              await checkpoint({
                score: finalScore,
                lines,
                level: currentLevel,
                perks: activePerks.map((p) => p.id), // backend OK
                mutations: activeMutations.map((mutation) => ({
                  id: mutation.id,
                  stacks: mutation.stacks,
                })),
                bombs,
                timeFreezeCharges,
                chaosMode,
                gravityMultiplier,
                scoreMultiplier,
                seed: "",
              });
            } finally {
              await finishRun("FINISHED");

              // 🔄 reset pour prochaine run
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
              setBombs(0);
              setBombsUsed(0);
              setBombsGranted(0);
              setTimeFreezeCharges(0);
              setTimeFreezeDuration(5000);
              setTimeFreezeEcho(false);
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
              setZeroBombBoost(false);
              setNoBombBonus(false);
              setSecondChanceRechargeEvery(null);
              setRotationDelayMs(0);
            }
          }}
        />
      </main>

      <aside className="rogue-right">
        <ControlsPanel
          bombs={bombs}
          timeFreezeCharges={timeFreezeCharges}
          chaosMode={chaosMode}
          paused={manualPause}
          onTogglePause={() => setManualPause((v) => !v)}
        />
      </aside>
      {manualPause && !showSummary && (
        <div className="rogue-pause-overlay" role="status" aria-live="polite">
          <div className="rogue-pause-card">
            <p>Jeu en pause</p>
            <button onClick={() => setManualPause(false)}>Reprendre</button>
          </div>
        </div>
      )}
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
    </div>
  );
}
