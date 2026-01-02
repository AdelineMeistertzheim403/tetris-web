import { useEffect, useRef, useState } from "react";
import PerksPanel from "./PerksPanel";
import RunInfo from "./RunInfo";
import TetrisBoard from "./TetrisBoard";
import PerkSelectionOverlay from "./PerkSelectionOverlay";
import type { Perk } from "../types/Perk";
import { applyPerk } from "./applyPerk";
import { generatePerkChoices } from "../utils/perkRng";
import { ALL_PERKS } from "../data/perks";
import ControlsPanel from "./ControlsPanel";

export type ActivePerkRuntime = Perk & {
  startedAt?: number;
  expiresAt?: number;
  pending?: boolean;
};

export default function RoguelikeRun() {
  const [selectingPerk, setSelectingPerk] = useState(true);
  const [gravityMultiplier, setGravityMultiplier] = useState(1);
  const [extraHoldSlots, setExtraHoldSlots] = useState(0);
  const [addBombFn, setAddBombFn] = useState<(() => void) | null>(null);
  const [perkChoices, setPerkChoices] = useState<Perk[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [secondChance, setSecondChance] = useState(false);
  const [timeFreezeCharges, setTimeFreezeCharges] = useState(0);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [timeFreezeDuration, setTimeFreezeDuration] = useState(5000);
  const [chaosMode, setChaosMode] = useState(false);
  const [bombRadius, setBombRadius] = useState(1); // 1 = 3x3
  const [bombs, setBombs] = useState(0);
  const [activePerks, setActivePerks] = useState<ActivePerkRuntime[]>([]);
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const consumeSecondChance = () => {
    setSecondChance(false);
    setActivePerks((prev) => prev.filter((p) => p.id !== "second-chance"));
  };

  const handleSelectPerk = (perk: Perk) => {
    const isTimeFreeze = perk.id === "time-freeze";
    const durationMs = perk.durationMs ?? 5000;

    applyPerk(perk, {
      addHoldSlot: () => setExtraHoldSlots((v) => v + 1),

      slowGravity: (factor = 1.5) => setGravityMultiplier((v) => v * factor),

      addBomb: (count = 1) => {
        setBombs((v) => v + count);
        for (let i = 0; i < count; i++) addBombFn?.();
      },

      addScoreBoost: (value = 0.5) => setScoreMultiplier((v) => v + value),

      grantSecondChance: () => setSecondChance(true),

      addTimeFreeze: (count = 1) => setTimeFreezeCharges((v) => v + count),

      enableChaosMode: () => setChaosMode(true),

      setBombRadius: (radius: number) => setBombRadius(radius),
    });

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

  useEffect(() => {
    if (selectingPerk) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setActivePerks((prev) => prev.filter((p) => !p.expiresAt || p.expiresAt > now));
    }, 250);

    return () => clearInterval(interval);
  }, [selectingPerk]);

  useEffect(() => {
    if (!selectingPerk) return;

    setPerkChoices(generatePerkChoices(ALL_PERKS, 3, activePerks.map((p) => p.id)));
  }, [selectingPerk, activePerks]);

  useEffect(() => {
    setChaosMode(activePerks.some((p) => p.id === "chaos-mode"));
  }, [activePerks]);

  useEffect(() => {
    return () => {
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="rogue-run">
      {selectingPerk && (
        <PerkSelectionOverlay perks={perkChoices} onSelect={handleSelectPerk} />
      )}
      <aside className="rogue-left">
        <RunInfo />
        <div className="perks-wrapper">
          <PerksPanel perks={activePerks} />
        </div>
      </aside>

      <main className="rogue-center">
        <TetrisBoard
          mode="ROGUELIKE"
          autoStart={!selectingPerk}
          gravityMultiplier={gravityMultiplier}
          extraHold={extraHoldSlots}
          onAddBomb={setAddBombFn}
          scoreMultiplier={scoreMultiplier}
          secondChance={secondChance}
          onConsumeSecondChance={consumeSecondChance}
          timeFrozen={timeFrozen}
          onTriggerTimeFreeze={triggerTimeFreeze}
          timeFreezeCharges={timeFreezeCharges}
          chaosMode={chaosMode}
          bombRadius={bombRadius}
           onBombsChange={setBombs}
        />
      </main>

      <aside className="rogue-right">
        <ControlsPanel bombs={bombs} timeFreezeCharges={timeFreezeCharges} chaosMode={chaosMode} />
      </aside>
    </div>
  );
}
