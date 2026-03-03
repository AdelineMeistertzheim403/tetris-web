import { useEffect, useMemo, useRef, useState } from "react";
import {
  PLAYER_IDLE_SPRITE,
  PLAYER_JUMP_SPRITE,
  PLAYER_RUN_SPRITE,
  RUN_ANIMATION_FRAME_MS,
} from "../constants";
import { updateRuntime } from "../game/updateRuntime";
import { usePixelProtocolControls } from "./usePixelProtocolControls";
import { usePixelProtocolViewport } from "./usePixelProtocolViewport";
import { LEVELS as DEFAULT_LEVELS } from "../levels";
import { abilityFlags, cloneLevel } from "../logic";
import type { GameRuntime, LevelDef } from "../types";

export function usePixelProtocolGame(levels: LevelDef[]) {
  const [, setRenderTick] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const safeLevels = levels.length > 0 ? levels : DEFAULT_LEVELS;
  const runtimeRef = useRef<GameRuntime>(cloneLevel(safeLevels[0]));
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(performance.now());
  const { clearJustPressed, readInput } = usePixelProtocolControls();
  const { gameViewportRef, viewportHeight, viewportWidth } =
    usePixelProtocolViewport();

  const level = safeLevels[levelIndex] ?? safeLevels[0];
  const ability = useMemo(() => abilityFlags(level.world), [level.world]);

  useEffect(() => {
    setLevelIndex(0);
  }, [levels]);

  useEffect(() => {
    runtimeRef.current = cloneLevel(level);
    setRenderTick((v) => v + 1);
  }, [level]);

  useEffect(() => {
    const loop = (ts: number) => {
      const dt = Math.min(0.033, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      const game = runtimeRef.current;
      const now = ts;

      if (game.status === "running") {
        updateRuntime({
          ability,
          dt,
          game,
          input: readInput(),
          level,
          now,
          onAdvanceLevel: () => {
            if (levelIndex < safeLevels.length - 1) {
              game.message = "Portail actif: transfert vers le secteur suivant...";
              setLevelIndex((current) => current + 1);
            } else {
              game.status = "won";
              game.message = "TETRIX CORE neutralise. Le systeme est recompile.";
            }
          },
          viewportHeight,
          viewportWidth,
        });
      }

      clearJustPressed();
      setRenderTick((v) => v + 1);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [
    ability.airDash,
    ability.doubleJump,
    ability.hackWave,
    ability.shield,
    clearJustPressed,
    level,
    levelIndex,
    readInput,
    safeLevels.length,
    viewportHeight,
    viewportWidth,
  ]);

  const runtime = runtimeRef.current;
  const portalOpen = runtime.collected >= level.requiredOrbs;
  const isRunning = runtime.player.grounded && Math.abs(runtime.player.vx) > 35;
  const playerRunFrame =
    Math.floor(performance.now() / RUN_ANIMATION_FRAME_MS) % 2;
  const playerSprite = !runtime.player.grounded
    ? PLAYER_JUMP_SPRITE
    : isRunning
      ? playerRunFrame === 0
        ? PLAYER_IDLE_SPRITE
        : PLAYER_RUN_SPRITE
      : PLAYER_IDLE_SPRITE;

  const resetLevel = () => {
    runtimeRef.current = cloneLevel(level);
    setRenderTick((v) => v + 1);
  };

  return {
    ability,
    gameViewportRef,
    level,
    playerRunFrame,
    playerSprite,
    portalOpen,
    resetLevel,
    runtime,
  };
}
