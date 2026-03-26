import { useEffect, useMemo, useRef, useState } from "react";
import { usePixelMode } from "../../pixelMode/hooks/usePixelMode";
import { BOARD_WIDTH, GAME_LOOP_MS, MAX_SHIELD, PLAYER_WIDTH, clamp, createMessage } from "../model";
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
  const [paused, setPaused] = useState(false);
  const inputRef = useRef<InputState>({ ...INITIAL_INPUT_STATE });
  const queuedActionsRef = useRef({ dash: false, bomb: false });
  const pixelMirrorUntilRef = useRef(0);
  const pixelJamUntilRef = useRef(0);
  const pixelNextEventAtRef = useRef(0);
  const {
    gameplayRouteActive: pixelModeActive,
    instabilityLevel,
    reportRuntimeEvent,
  } = usePixelMode();

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

  const clearInputs = () => {
    inputRef.current = { ...INITIAL_INPUT_STATE };
    queuedActionsRef.current = { dash: false, bomb: false };
  };

  const clearPixelDistortions = () => {
    pixelMirrorUntilRef.current = 0;
    pixelJamUntilRef.current = 0;
    pixelNextEventAtRef.current = 0;
  };

  const pauseGame = () => {
    clearInputs();
    setPaused(true);
  };

  const resumeGame = () => {
    clearInputs();
    setPaused(false);
  };

  const loadGame = (snapshot: GameState) => {
    clearInputs();
    clearPixelDistortions();
    setGame(snapshot);
  };

  const resetGame = () => {
    clearInputs();
    clearPixelDistortions();
    setPaused(false);
    setGame(createInitialState());
  };

  useEffect(() => {
    if (pixelModeActive) return;
    clearPixelDistortions();
  }, [pixelModeActive]);

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
      if (paused) {
        previousTime = timestamp;
        accumulator = 0;
        frameId = window.requestAnimationFrame(loop);
        return;
      }

      const elapsed = Math.min(64, timestamp - previousTime);
      previousTime = timestamp;
      accumulator += elapsed;

      if (accumulator >= GAME_LOOP_MS) {
        setGame((current) => {
          let simulated = current;

          while (accumulator >= GAME_LOOP_MS) {
            const now = timestamp;
            const jamActive = pixelModeActive && now < pixelJamUntilRef.current;
            const mirrorActive = pixelModeActive && now < pixelMirrorUntilRef.current;
            const frameInput: InputState = {
              ...inputRef.current,
              left: mirrorActive ? inputRef.current.right : inputRef.current.left,
              right: mirrorActive ? inputRef.current.left : inputRef.current.right,
              shoot: jamActive ? false : inputRef.current.shoot,
              dash: jamActive ? false : queuedActionsRef.current.dash,
              bomb: jamActive ? false : queuedActionsRef.current.bomb,
            };
            if (jamActive) {
              queuedActionsRef.current.dash = false;
              queuedActionsRef.current.bomb = false;
            }
            const next = stepGame(simulated, frameInput, GAME_LOOP_MS);

            if (
              pixelModeActive &&
              instabilityLevel > 0 &&
              next.running &&
              !next.gameOver &&
              !next.victory
            ) {
              if (now >= pixelNextEventAtRef.current) {
                const eventInterval = Math.max(1_950, 4_900 - instabilityLevel * 260);
                pixelNextEventAtRef.current = now + eventInterval + Math.random() * 950;

                const roll = Math.random();
                if (roll < 0.35) {
                  pixelMirrorUntilRef.current = now + 760 + instabilityLevel * 130;
                  next.message = createMessage("apex", "warning", "Le signal se retourne.");
                  next.messageTimer = Math.max(next.messageTimer, 1.9);
                  reportRuntimeEvent({
                    sourceLabel: "Pixel Invasion",
                    title: "Signal retourne",
                    description: "Les commandes gauche/droite sont inversees quelques instants.",
                    severity: "medium",
                    ttlMs: 1900,
                  });
                } else if (roll < 0.68) {
                  pixelJamUntilRef.current = now + 520 + instabilityLevel * 95;
                  next.message = createMessage("pulse", "warning", "Arme brouillee. Reprends la cadence.");
                  next.messageTimer = Math.max(next.messageTimer, 1.8);
                  reportRuntimeEvent({
                    sourceLabel: "Pixel Invasion",
                    title: "Arme brouillee",
                    description: "Le tir, le dash et la bombe repondent avec un leger retard.",
                    severity: "medium",
                    ttlMs: 1900,
                  });
                } else if (roll < 0.86) {
                  next.boardShakeTimer = Math.max(next.boardShakeTimer, 0.1 + instabilityLevel * 0.015);
                  next.playerDriftX = clamp(
                    next.playerDriftX + (Math.random() < 0.5 ? -1 : 1) * (5 + instabilityLevel),
                    -14,
                    14
                  );
                  next.message = createMessage("rookie", "warning", "Pixel tord la visee. Reste stable !");
                  next.messageTimer = Math.max(next.messageTimer, 1.6);
                  reportRuntimeEvent({
                    sourceLabel: "Pixel Invasion",
                    title: "Visee desynchronisee",
                    description: "Le cockpit tremble et la trajectoire se desaxe brievement.",
                    severity: "low",
                    ttlMs: 1700,
                  });
                } else {
                  const driftDirection = Math.random() < 0.5 ? -1 : 1;
                  const driftDistance = 8 + instabilityLevel * 4;
                  next.playerX = clamp(
                    next.playerX + driftDirection * driftDistance,
                    14,
                    BOARD_WIDTH - PLAYER_WIDTH - 14
                  );
                  next.playerDriftX = clamp(
                    next.playerDriftX + driftDirection * (3 + instabilityLevel),
                    -14,
                    14
                  );
                  next.boardShakeTimer = Math.max(next.boardShakeTimer, 0.08);
                  next.message = createMessage("apex", "boss", "La trajectoire ne t'appartient plus.");
                  next.messageTimer = Math.max(next.messageTimer, 1.9);
                  reportRuntimeEvent({
                    sourceLabel: "Pixel Invasion",
                    title: "Trajectoire forcee",
                    description: "Le vaisseau derive lateralement sous l'emprise de Pixel.",
                    severity: "high",
                    ttlMs: 2000,
                  });
                }
              }
            }

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
  }, [instabilityLevel, paused, pixelModeActive, reportRuntimeEvent]);

  const shieldRatio = useMemo(() => clamp(game.shield / MAX_SHIELD, 0, 1), [game.shield]);

  return {
    game,
    paused,
    pauseGame,
    resumeGame,
    loadGame,
    resetGame,
    setPaused,
    shieldRatio,
  };
}
