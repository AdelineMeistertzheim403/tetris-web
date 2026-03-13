import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPixelProtocolChatLine,
  type PixelProtocolChatLine,
  type PlatformerEvent,
} from "../dialogue";
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
import { abilityFlags, cloneLevel, levelTopPadding, selectGrappleTarget } from "../logic";
import type { EnemyKind, GameRuntime, LevelDef, PixelSkill } from "../types";

export function usePixelProtocolGame(
  levels: LevelDef[],
  options?: {
    initialLevelIndex?: number;
    initialUnlockedSkills?: PixelSkill[];
    onUnlockSkills?: (skills: PixelSkill[]) => void;
  }
) {
  const [, setRenderTick] = useState(0);
  const safeLevels = levels.length > 0 ? levels : DEFAULT_LEVELS;
  const [levelIndex, setLevelIndex] = useState(() => {
    const requested = options?.initialLevelIndex ?? 0;
    return Math.max(0, Math.min(requested, safeLevels.length - 1));
  });
  const runtimeRef = useRef<GameRuntime>(cloneLevel(safeLevels[0]));
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(performance.now());
  const lastChatAtRef = useRef(0);
  const idleSinceRef = useRef<number | null>(null);
  const jumpChainRef = useRef(0);
  const lastJumpAtRef = useRef(0);
  const { clearJustPressed, readInput } = usePixelProtocolControls();
  const { gameViewportRef, viewportHeight, viewportWidth } =
    usePixelProtocolViewport();
  const [chatLine, setChatLine] = useState<PixelProtocolChatLine | null>(null);
  const [unlockedSkills, setUnlockedSkills] = useState<PixelSkill[]>(
    () => options?.initialUnlockedSkills ?? []
  );

  const level = safeLevels[levelIndex] ?? safeLevels[0];
  const ability = useMemo(
    () => abilityFlags(level.world, unlockedSkills),
    [level.world, unlockedSkills]
  );
  const availableSpeakers = useMemo(
    () => Array.from(new Set(level.enemies.map((enemy) => enemy.kind))) as EnemyKind[],
    [level.enemies]
  );

  const pushDialogue = (
    event: PlatformerEvent,
    preferredSpeaker: EnemyKind | null = null
  ) => {
    const now = Date.now();
    if (now - lastChatAtRef.current < 2200) return;
    const line = buildPixelProtocolChatLine(event, {
      availableSpeakers,
      now,
      preferredSpeaker,
    });
    if (!line) return;
    setChatLine(line);
    lastChatAtRef.current = now;
  };

  const getNearestSpeaker = (game: GameRuntime): EnemyKind | null => {
    let nearest: { kind: EnemyKind; distance: number } | null = null;
    for (const enemy of game.enemies) {
      const dx = enemy.x - game.player.x;
      const dy = enemy.y - game.player.y;
      const distance = Math.abs(dx) + Math.abs(dy);
      if (!nearest || distance < nearest.distance) {
        nearest = { kind: enemy.kind, distance };
      }
    }
    return nearest?.kind ?? availableSpeakers[0] ?? null;
  };

  useEffect(() => {
    const requested = options?.initialLevelIndex ?? 0;
    setLevelIndex(Math.max(0, Math.min(requested, safeLevels.length - 1)));
  }, [options?.initialLevelIndex, safeLevels.length]);

  useEffect(() => {
    setUnlockedSkills(options?.initialUnlockedSkills ?? []);
  }, [options?.initialUnlockedSkills]);

  useEffect(() => {
    const previous = runtimeRef.current;
    const nextRuntime = cloneLevel(level);
    if (previous.status === "won") {
      nextRuntime.player.hp = previous.player.hp;
      nextRuntime.player.health = previous.player.health;
      nextRuntime.player.maxHealth = previous.player.maxHealth;
    }
    runtimeRef.current = nextRuntime;
    idleSinceRef.current = null;
    jumpChainRef.current = 0;
    lastJumpAtRef.current = 0;
    pushDialogue("level_start");
    setRenderTick((v) => v + 1);
  }, [level]);

  useEffect(() => {
    const loop = (ts: number) => {
      const dt = Math.min(0.033, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      const game = runtimeRef.current;
      const now = ts;
      const input = readInput();

      if (game.status === "running") {
        const prevCollected = game.collected;
        const prevHp = game.player.hp;
        const prevGrounded = game.player.grounded;
        const prevTakenOrbs = new Set(
          game.orbs.filter((orb) => orb.taken).map((orb) => orb.id)
        );
        const prevStuns = new Map(
          game.enemies.map((enemy) => [enemy.id, enemy.stunnedUntil] as const)
        );

        updateRuntime({
          ability,
          dt,
          game,
          input,
          level,
          now,
          onAdvanceLevel: () => {
            const elapsedMs = now - game.startedAt;
            if (elapsedMs < 45000) {
              pushDialogue("player_speedrun", getNearestSpeaker(game));
            }
            pushDialogue("player_finish_level", getNearestSpeaker(game));
            game.status = "won";
            game.message =
              levelIndex < safeLevels.length - 1
                ? "Portail actif: secteur suivant pret."
                : "TETRIX CORE neutralise. Le systeme est recompile.";
          },
          viewportHeight,
          viewportWidth,
        });

        if (game.collected > prevCollected) {
          pushDialogue("player_collect_orb", getNearestSpeaker(game));
          const manyOrbThreshold = Math.max(3, Math.ceil(level.requiredOrbs * 0.6));
          if (prevCollected < manyOrbThreshold && game.collected >= manyOrbThreshold) {
            pushDialogue("player_collect_many_orbs", getNearestSpeaker(game));
          }
        }

        const newlyUnlocked = game.orbs
          .filter((orb) => orb.taken && !prevTakenOrbs.has(orb.id) && orb.grantsSkill)
          .map((orb) => orb.grantsSkill as PixelSkill);

        if (newlyUnlocked.length > 0) {
          setUnlockedSkills((current) => {
            const next = Array.from(new Set([...current, ...newlyUnlocked]));
            options?.onUnlockSkills?.(next);
            return next;
          });
          game.message = `Module debloque: ${newlyUnlocked[0].replaceAll("_", " ")}`;
          pushDialogue("player_secret_found", getNearestSpeaker(game));
        }

        if (game.player.hp < prevHp) {
          pushDialogue("player_fall", getNearestSpeaker(game));
          if (game.player.hp <= 1) {
            pushDialogue("player_near_death", "apex");
          }
        }

        if (input.wantHack && ability.hackWave) {
          pushDialogue("player_glitch_power", getNearestSpeaker(game));
        }

        if (input.wantJump) {
          if (now - lastJumpAtRef.current < 2200) jumpChainRef.current += 1;
          else jumpChainRef.current = 1;
          lastJumpAtRef.current = now;
          if (jumpChainRef.current >= 4) {
            pushDialogue("player_jump_chain", getNearestSpeaker(game));
            jumpChainRef.current = 0;
          }
        }

        if (
          !input.left &&
          !input.right &&
          !input.wantJump &&
          !input.wantDash &&
          Math.abs(game.player.vx) < 8 &&
          game.player.grounded
        ) {
          if (idleSinceRef.current === null) idleSinceRef.current = now;
          if (now - idleSinceRef.current > 5000) {
            pushDialogue("player_idle", getNearestSpeaker(game));
            idleSinceRef.current = now + 20000;
          }
        } else {
          idleSinceRef.current = null;
        }

        if (
          !prevGrounded &&
          game.player.grounded &&
          game.player.y + game.player.h >= level.spawn.y + levelTopPadding(level) + 60
        ) {
          pushDialogue("player_fail_jump", getNearestSpeaker(game));
        }

        for (const enemy of game.enemies) {
          const previous = prevStuns.get(enemy.id) ?? 0;
          if (enemy.stunnedUntil > previous && enemy.stunnedUntil > now) {
            pushDialogue(
              enemy.kind === "apex" ? "player_kill_apex" : "player_kill_robot",
              enemy.kind
            );
            break;
          }
        }

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
  const currentInput = readInput();
  const grapplePreview =
    ability.dataGrapple
      ? selectGrappleTarget({
          platforms: runtime.platforms,
          player: runtime.player,
          aimX: (currentInput.right ? 1 : 0) - (currentInput.left ? 1 : 0),
          aimY: (currentInput.down ? 1 : 0) - (currentInput.up ? 1 : 0),
        })
      : null;
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

  const advanceLevel = () => {
    if (levelIndex >= safeLevels.length - 1) return;
    setLevelIndex((current) => Math.min(current + 1, safeLevels.length - 1));
  };

  return {
    advanceLevel,
    ability,
    unlockedSkills,
    hasNextLevel: levelIndex < safeLevels.length - 1,
    gameViewportRef,
    level,
    levelIndex,
    playerRunFrame,
    playerSprite,
    portalOpen,
    grapplePreview,
    resetLevel,
    runtime,
    chatLine,
  };
}
