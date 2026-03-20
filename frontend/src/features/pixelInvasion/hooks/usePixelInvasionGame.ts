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

  const resetGame = () => {
    inputRef.current = { ...INITIAL_INPUT_STATE };
    setGame(createInitialState());
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat && event.code === "Space") {
        event.preventDefault();
      }

      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = true;
      if (event.code === "Space") {
        inputRef.current.shoot = true;
        event.preventDefault();
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        inputRef.current.dash = true;
        event.preventDefault();
      }
      if (event.code === "KeyB") inputRef.current.bomb = true;
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = false;
      if (event.code === "Space") inputRef.current.shoot = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGame((current) => {
        const next = stepGame(current, inputRef.current, GAME_LOOP_MS);
        inputRef.current.dash = false;
        inputRef.current.bomb = false;
        return next;
      });
    }, GAME_LOOP_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const shieldRatio = useMemo(() => clamp(game.shield / MAX_SHIELD, 0, 1), [game.shield]);

  return {
    game,
    resetGame,
    shieldRatio,
  };
}
