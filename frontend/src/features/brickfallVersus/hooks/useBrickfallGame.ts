import { useCallback, useEffect, useMemo, useState } from "react";

type BrickfallEvent =
  | { type: "line_clear"; lines: number }
  | { type: "spawn_block"; blockType: "normal" | "armored" | "bomb" | "cursed" | "mirror" }
  | { type: "apply_debuff"; debuff: string }
  | { type: "blocks_destroyed"; count: number }
  | { type: "bomb_detonated"; radius: number }
  | { type: "pieces_placed"; count: number };

export type BrickfallState = {
  ballSpeedMultiplier: number;
  debuff: string | null;
  blocksDestroyed: number;
  pendingGarbageTriggers: number;
  architectPiecesPlaced: number;
  lives: number;
  lastSpawnedBlock: BrickfallEvent | null;
};

type BrickfallGameOptions = {
  onState?: (state: BrickfallState) => void;
  onOutgoingEvent?: (event: BrickfallEvent) => void;
};

export function useBrickfallGame({ onState, onOutgoingEvent }: BrickfallGameOptions) {
  const [ballSpeedMultiplier, setBallSpeedMultiplier] = useState(1);
  const [debuff, setDebuff] = useState<string | null>(null);
  const [blocksDestroyed, setBlocksDestroyed] = useState(0);
  const [pendingGarbageTriggers, setPendingGarbageTriggers] = useState(0);
  const [architectPiecesPlaced, setArchitectPiecesPlaced] = useState(0);
  const [lives, setLives] = useState(1);
  const [lastSpawnedBlock, setLastSpawnedBlock] = useState<BrickfallEvent | null>(null);

  const state = useMemo(
    () => ({
      ballSpeedMultiplier,
      debuff,
      blocksDestroyed,
      pendingGarbageTriggers,
      architectPiecesPlaced,
      lives,
      lastSpawnedBlock,
    }),
    [
      ballSpeedMultiplier,
      debuff,
      blocksDestroyed,
      pendingGarbageTriggers,
      architectPiecesPlaced,
      lives,
      lastSpawnedBlock,
    ]
  );

  useEffect(() => {
    onState?.(state);
  }, [onState, state]);

  const applyIncomingEvent = useCallback((event: BrickfallEvent) => {
    if (event.type === "line_clear") {
      setBallSpeedMultiplier((prev) => prev + event.lines * 0.05);
      return;
    }
    if (event.type === "apply_debuff") {
      setDebuff(event.debuff);
      return;
    }
    if (event.type === "spawn_block") {
      setLastSpawnedBlock(event);
      return;
    }
    if (event.type === "pieces_placed") {
      setArchitectPiecesPlaced(event.count);
      return;
    }
  }, []);

  const registerBlocksDestroyed = useCallback(
    (count: number) => {
      setBlocksDestroyed((prev) => prev + count);
      setPendingGarbageTriggers((prev) => {
        const next = prev + count;
        const triggers = Math.floor(next / 5);
        if (triggers > 0) {
          onOutgoingEvent?.({ type: "blocks_destroyed", count: triggers * 5 });
        }
        return next % 5;
      });
    },
    [onOutgoingEvent]
  );

  const registerBombDetonation = useCallback(
    (radius: number) => {
      onOutgoingEvent?.({ type: "bomb_detonated", radius });
    },
    [onOutgoingEvent]
  );

  const loseLife = useCallback(() => {
    setLives((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    state,
    actions: {
      applyIncomingEvent,
      registerBlocksDestroyed,
      registerBombDetonation,
      loseLife,
    },
  };
}
