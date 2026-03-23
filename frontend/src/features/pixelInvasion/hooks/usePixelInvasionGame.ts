import { useEffect, useMemo, useRef, useState } from "react";
import { GAME_LOOP_MS, MAX_SHIELD, clamp } from "../model";
import type { GameState, InputState } from "../model";
import { createInitialState, stepGame } from "../logic/pixelInvasionGame";

const INITIAL_INPUT_STATE: InputState = {
  left: false,
  right: false,
  shoot: false,
  dash: false,
  bomb: false,
};

/**
 * Adaptateur React entre la simulation pure et l'UI.
 * Il gère uniquement les inputs, le reset et la cadence du tick.
 */
export function usePixelInvasionGame() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const inputRef = useRef<InputState>({ ...INITIAL_INPUT_STATE });
  const queuedActionsRef = useRef({ dash: false, bomb: false });

  const isLeftKey = (event: KeyboardEvent) =>
    event.code === "ArrowLeft" || event.code === "KeyA" || event.key === "ArrowLeft" || event.key.toLowerCase() === "a";

  const isRightKey = (event: KeyboardEvent) =>
    event.code === "ArrowRight" || event.code === "KeyD" || event.key === "ArrowRight" || event.key.toLowerCase() === "d";

  const isShootKey = (event: KeyboardEvent) => event.code === "Space" || event.key === " ";

  const isDashKey = (event: KeyboardEvent) =>
    event.code === "ShiftLeft" ||
    event.code === "ShiftRight" ||
    event.key === "Shift" ||
    event.code === "Numpad0";

  const isBombKey = (event: KeyboardEvent) =>
    event.code === "KeyB" || event.key.toLowerCase() === "b";

  const resetGame = () => {
    inputRef.current = { ...INITIAL_INPUT_STATE };
    queuedActionsRef.current = { dash: false, bomb: false };
    setGame(createInitialState());
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat && isShootKey(event)) {
        event.preventDefault();
      }

      if (isLeftKey(event)) inputRef.current.left = true;
      if (isRightKey(event)) inputRef.current.right = true;
      if (isShootKey(event)) {
        inputRef.current.shoot = true;
        event.preventDefault();
      }
      if (isDashKey(event) && !event.repeat) {
        queuedActionsRef.current.dash = true;
        event.preventDefault();
      }
      if (isBombKey(event) && !event.repeat) {
        queuedActionsRef.current.bomb = true;
        event.preventDefault();
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (isLeftKey(event)) inputRef.current.left = false;
      if (isRightKey(event)) inputRef.current.right = false;
      if (isShootKey(event)) inputRef.current.shoot = false;
      if (isDashKey(event)) event.preventDefault();
      if (isBombKey(event)) event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();
    let accumulator = 0;

    const consumeQueuedActions = (current: GameState, next: GameState) => {
      if (queuedActionsRef.current.dash) {
        const dashConsumed =
          next.dashCooldown > current.dashCooldown || next.playerDashFx > current.playerDashFx;
        const dashBlocked = next.gameOver || next.victory;
        if (dashConsumed || dashBlocked) {
          queuedActionsRef.current.dash = false;
        }
      }

      if (queuedActionsRef.current.bomb) {
        const bombConsumed = next.bombs < current.bombs || next.bombCooldown > current.bombCooldown;
        const bombBlocked = next.gameOver || next.victory;
        if (bombConsumed || bombBlocked) {
          queuedActionsRef.current.bomb = false;
        }
      }
    };

    const loop = (timestamp: number) => {
      const elapsed = Math.min(64, timestamp - previousTime);
      previousTime = timestamp;
      accumulator += elapsed;

      if (accumulator >= GAME_LOOP_MS) {
        setGame((current) => {
          let simulated = current;

          while (accumulator >= GAME_LOOP_MS) {
            const frameInput: InputState = {
              ...inputRef.current,
              dash: queuedActionsRef.current.dash,
              bomb: queuedActionsRef.current.bomb,
            };
            const next = stepGame(simulated, frameInput, GAME_LOOP_MS);
            consumeQueuedActions(simulated, next);
            simulated = next;
            accumulator -= GAME_LOOP_MS;
          }

          return simulated;
        });
      }

      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const shieldRatio = useMemo(() => clamp(game.shield / MAX_SHIELD, 0, 1), [game.shield]);

  return {
    game,
    resetGame,
    shieldRatio,
  };
}
