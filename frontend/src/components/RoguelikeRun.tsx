import { useCallback, useEffect, useRef, useState } from "react";
import PerksPanel from "./PerksPanel";
import RunInfo from "./RunInfo";
import TetrisBoard from "./TetrisBoard";
import PerkSelectionOverlay from "./PerkSelectionOverlay";
import type { Perk } from "../types/Perk";
import { applyPerk } from "./applyPerk";
import { generatePerkChoices } from "../utils/perkRng";
import { ALL_PERKS } from "../data/perks";
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

export type ActivePerkRuntime = Perk & {
  startedAt?: number;
  expiresAt?: number;
  pending?: boolean;
};

export default function RoguelikeRun() {
  const [selectingPerk, setSelectingPerk] = useState(true);
  const [gravityMultiplier, setGravityMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [perkChoices, setPerkChoices] = useState<Perk[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [secondChance, setSecondChance] = useState(false);
  const [timeFreezeCharges, setTimeFreezeCharges] = useState(0);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [timeFreezeDuration, setTimeFreezeDuration] = useState(5000);
  const [chaosMode, setChaosMode] = useState(false);
  const [bombRadius, setBombRadius] = useState(1); // 1 = 3x3
  const [bombs, setBombs] = useState(0);
  const [bombsGranted, setBombsGranted] = useState(0);
  const [activePerks, setActivePerks] = useState<ActivePerkRuntime[]>([]);
  const [fastHoldReset, setFastHoldReset] = useState(false);
  const [lastStand, setLastStand] = useState(false);
  const [synergyToast, setSynergyToast] = useState<Synergy | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synergyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nextPerkAt, setNextPerkAt] = useState(10);
  const [totalLines, setTotalLines] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
const [currentLevel, setCurrentLevel] = useState(1);
const navigate = useNavigate();
const [summaryPerks, setSummaryPerks] = useState<ActivePerkRuntime[]>([]);
  const [summaryScore, setSummaryScore] = useState(0);
  const [summaryLines, setSummaryLines] = useState(0);
  const [summaryLevel, setSummaryLevel] = useState(1);
  const rngRef = useRef<(() => number) | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const runStartedRef = useRef(false);
  const resetLocalState = useCallback(() => {
    setActivePerks([]);
    setCurrentScore(0);
    setCurrentLevel(1);
    setTotalLines(0);
    setNextPerkAt(10);
    setBombs(0);
    setBombsGranted(0);
    setTimeFreezeCharges(0);
    setChaosMode(false);
    setFastHoldReset(false);
    setLastStand(false);
    setRunEnded(false);
    setSelectingPerk(true);
    setShowSummary(false);
    setBoardKey((k) => k + 1);
    runStartedRef.current = false;
  }, []);
  const linesUntilNextPerk = Math.max(
  0,
  nextPerkAt - totalLines
);
const perkProgress = 1 - (linesUntilNextPerk / 10);
const activeSynergies = useActiveSynergies(activePerks, SYNERGIES);

  const consumeSecondChance = () => {
    setSecondChance(false);
    setActivePerks((prev) => prev.filter((p) => p.id !== "second-chance"));
  };

  const {
  run,
  startRun,
  checkpoint,
  finishRun,
  hasActiveRun,
} = useRoguelikeRun();

 const handleConsumeLines = (linesCleared: number) => {
  setTotalLines((prev) => {
    const newTotal = prev + linesCleared;

    if (newTotal >= nextPerkAt) {
      setSelectingPerk(true);
      setNextPerkAt(nextPerkAt + 10);

      checkpoint({
        score: currentScore,
        lines: newTotal,
        level: currentLevel,
        perks: activePerks.map(p => p.id),
        bombs,
        timeFreezeCharges,
        chaosMode,
        gravityMultiplier,
        scoreMultiplier,
        seed: ""
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

      addBomb: (count = 1) => {
        setBombs((v) => v + count);
        setBombsGranted((v) => v + count);
      },

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

  const triggerTimeFreeze = () => {
    if (timeFreezeCharges <= 0 || timeFrozen) return;

    setTimeFreezeCharges((v) => v - 1);
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
    addBomb: (n) => setBombs(v => v + n),
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
    setPerkChoices(
      generatePerkChoices(
        ALL_PERKS,
        3,
        activePerks.map((p) => p.id),
        rng
      )
    );
  }, [selectingPerk, activePerks]);

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
      {selectingPerk && (
        <PerkSelectionOverlay perks={perkChoices} onSelect={handleSelectPerk} />
      )}
      <aside className="rogue-left">
        <RunInfo linesUntilNextPerk={linesUntilNextPerk} perkProgress={perkProgress} />
        <div className="perks-wrapper">
          <PerksPanel perks={activePerks} />
          <SynergiesPanel synergies={activeSynergies} />
        </div>
      </aside>

      <main className="rogue-center">
        <TetrisBoard
          key={boardKey}
          mode="ROGUELIKE"
          hideGameOverOverlay={true}
           paused={selectingPerk || showSummary}
          autoStart={!selectingPerk}
          gravityMultiplier={gravityMultiplier}
          extraHold={extraHoldSlots}
          bombsGranted={bombsGranted}
          scoreMultiplier={scoreMultiplier}
          secondChance={secondChance}
          onConsumeSecondChance={consumeSecondChance}
          timeFrozen={timeFrozen}
           onTriggerTimeFreeze={triggerTimeFreeze}
          timeFreezeCharges={timeFreezeCharges}
          fastHoldReset={fastHoldReset}
          lastStand={lastStand}
           onScoreChange={setCurrentScore}
  onLevelChange={setCurrentLevel}
  onConsumeLines={handleConsumeLines}
          chaosMode={chaosMode}
          bombRadius={bombRadius}
          rng={rngRef.current ?? undefined}
           onBombsChange={setBombs}
          onLocalGameOver={async (score, lines) => {
  if (!run) return;

  // 🧊 SNAPSHOT AVANT RESET
  setSummaryPerks([...activePerks]);
  setSummaryScore(score);
  setSummaryLines(lines);
  setSummaryLevel(currentLevel);

  setRunEnded(true);
  setSelectingPerk(false);
  setShowSummary(true);

  try {
    await checkpoint({
      score,
      lines,
      level: currentLevel,
      perks: activePerks.map(p => p.id), // backend OK
      bombs,
      timeFreezeCharges,
      chaosMode,
      gravityMultiplier,
      scoreMultiplier,
      seed: ""
    });
  } finally {
    await finishRun("FINISHED");

    // 🔄 reset pour prochaine run
    setActivePerks([]);
    setCurrentScore(0);
    setCurrentLevel(1);
    setTotalLines(0);
    setNextPerkAt(10);
    setBombs(0);
    setBombsGranted(0);
    setTimeFreezeCharges(0);
    setChaosMode(false);
    setFastHoldReset(false);
    setLastStand(false);
  }
}}
        />
      </main>

      <aside className="rogue-right">
        <ControlsPanel bombs={bombs} timeFreezeCharges={timeFreezeCharges} chaosMode={chaosMode} />
      </aside>
      <RoguelikeRunSummary
  visible={showSummary}
  score={summaryScore}
  lines={summaryLines}
  level={summaryLevel}
  perks={summaryPerks}
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
