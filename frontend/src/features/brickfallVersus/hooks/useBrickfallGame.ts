// Hook React useBrickfallGame.ts pour la logique d'etat/effets.
import { useCallback, useEffect, useMemo, useState } from "react";
import { BRICKFALL_BALANCE } from "../config/balance";

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
  spawnTick: number;
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
  const [lives, setLives] = useState(BRICKFALL_BALANCE.demolisher.startLives);
  const [lastSpawnedBlock, setLastSpawnedBlock] = useState<BrickfallEvent | null>(null);
  const [spawnTick, setSpawnTick] = useState(0);

  const state = useMemo(
    () => ({
      ballSpeedMultiplier,
      debuff,
      blocksDestroyed,
      pendingGarbageTriggers,
      architectPiecesPlaced,
      lives,
      lastSpawnedBlock,
      spawnTick,
    }),
    [
      ballSpeedMultiplier,
      debuff,
      blocksDestroyed,
      pendingGarbageTriggers,
      architectPiecesPlaced,
      lives,
      lastSpawnedBlock,
      spawnTick,
    ]
  );

  useEffect(() => {
    onState?.(state);
  }, [onState, state]);

  const applyIncomingEvent = useCallback((event: BrickfallEvent) => {
    if (event.type === "line_clear") {
      setBallSpeedMultiplier(
        (prev) => prev + event.lines * BRICKFALL_BALANCE.architect.lineClearSpeedStep
      );
      return;
    }
    if (event.type === "apply_debuff") {
      setDebuff(event.debuff);
      return;
    }
    if (event.type === "spawn_block") {
      setLastSpawnedBlock(event);
      setSpawnTick((prev) => prev + 1);
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
        const triggers = Math.floor(
          next / BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger
        );
        if (triggers > 0) {
          onOutgoingEvent?.({
            type: "blocks_destroyed",
            count: triggers * BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger,
          });
        }
        return next % BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger;
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
