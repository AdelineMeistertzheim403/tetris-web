import type { RefObject } from "react";
import {
  ENEMY_SPRITES,
  GROUND_Y,
  PLATFORM_CLASS,
  PLAYER_VISUAL_SCALE,
  WORLD_H,
  WORLD_RENDER_SCALE,
} from "../constants";
import { platformBlocks } from "../logic";
import type { GameRuntime, LevelDef } from "../types";

type PixelProtocolWorldProps = {
  gameViewportRef: RefObject<HTMLElement | null>;
  level: LevelDef;
  playerRunFrame: number;
  playerSprite: string;
  portalOpen: boolean;
  runtime: GameRuntime;
};

export function PixelProtocolWorld({
  gameViewportRef,
  level,
  playerRunFrame,
  playerSprite,
  portalOpen,
  runtime,
}: PixelProtocolWorldProps) {
  const now = performance.now();

  return (
    <section ref={gameViewportRef} className="pp-game">
      <div
        className="pp-world"
        style={{
          width: level.worldWidth,
          height: WORLD_H,
          transform: `translate(${-runtime.cameraX * WORLD_RENDER_SCALE}px, -${runtime.cameraY * WORLD_RENDER_SCALE}px) scale(${WORLD_RENDER_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <div
          className="pp-ground"
          style={{ top: GROUND_Y, width: level.worldWidth }}
        />

        {runtime.platforms.flatMap((platform) =>
          platformBlocks(platform).map((block, index) => (
            <div
              key={`${platform.id}-${index}-${platform.currentRotation}-${platform.active ? 1 : 0}`}
              className={`pp-platform ${PLATFORM_CLASS[platform.type]} ${
                platform.active ? "" : "pp-platform--off"
              }`}
              style={{
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
              }}
            />
          ))
        )}

        {runtime.orbs
          .filter((orb) => !orb.taken)
          .map((orb) => (
            <div
              key={orb.id}
              className="pp-orb"
              style={{ left: orb.x, top: orb.y }}
            />
          ))}

        {runtime.checkpoints.map((checkpoint) => (
          <div
            key={checkpoint.id}
            className={`pp-checkpoint ${
              checkpoint.activated ? "pp-checkpoint--active" : ""
            }`}
            style={{ left: checkpoint.x, top: checkpoint.y }}
          />
        ))}

        <div
          className={`pp-portal ${portalOpen ? "pp-portal--open" : ""}`}
          style={{ left: level.portal.x, top: level.portal.y }}
        />

        {runtime.enemies.map((enemy) => {
          const enemyRunFrame = Math.floor(now / 300) % 2;
          const enemyIsRunning = Math.abs(enemy.vx) > 0 && enemy.stunnedUntil <= now;
          const enemyConfig = ENEMY_SPRITES[enemy.kind];
          const enemySprite = enemyIsRunning
            ? enemyRunFrame === 0
              ? enemyConfig.idle
              : enemyConfig.run
            : enemyConfig.idle;
          const enemyVisualSize = 26 * enemyConfig.scale;

          return (
            <div
              key={enemy.id}
              className={`pp-enemy pp-enemy--sprite ${
                enemy.stunnedUntil > now ? "pp-enemy--stunned" : ""
              }`}
              style={{
                left: enemy.x - (enemyVisualSize - 26) / 2,
                top: enemy.y - (enemyVisualSize - 26),
                width: enemyVisualSize,
                height: enemyVisualSize,
                backgroundImage: `url(${enemySprite})`,
                transform: `scaleX(${enemy.vx >= 0 ? 1 : -1})`,
              }}
            />
          );
        })}

        <div
          className={`pp-player ${
            runtime.player.invulnUntil > now ? "pp-player--invuln" : ""
          }`}
          style={{
            left: runtime.player.x - (runtime.player.w * (PLAYER_VISUAL_SCALE - 1)) / 2,
            top: runtime.player.y - runtime.player.h * (PLAYER_VISUAL_SCALE - 1),
            width: runtime.player.w * PLAYER_VISUAL_SCALE,
            height: runtime.player.h * PLAYER_VISUAL_SCALE,
            backgroundImage: `url(${playerSprite})`,
            transform: `scaleX(${runtime.player.facing})`,
            zIndex: 3 + playerRunFrame,
          }}
        />
      </div>
    </section>
  );
}
