import type { RefObject } from "react";
import {
  ENEMY_SPRITES,
  PLATFORM_CLASS,
  PLAYER_VISUAL_SCALE,
  WORLD_RENDER_SCALE,
} from "../constants";
import {
  PixelProtocolDecoration,
} from "../decorations";
import {
  grappleAnchors,
  levelGroundY,
  levelTopPadding,
  platformBlocks,
} from "../logic";
import type { DecorationDef, GameRuntime, LevelDef } from "../types";

function decorationParallaxRatio(layer: DecorationDef["layer"]) {
  switch (layer) {
    case "far":
      return { x: 0.35, y: 0.2 };
    case "near":
      return { x: 0.9, y: 0.75 };
    case "mid":
    default:
      return { x: 0.65, y: 0.5 };
  }
}

function resolveDecorationParallax(decoration: DecorationDef) {
  if (decoration.parallaxEnabled === false) {
    return { x: 1, y: 1 };
  }

  const defaults = decorationParallaxRatio(decoration.layer);
  return {
    x:
      typeof decoration.parallaxX === "number" && Number.isFinite(decoration.parallaxX)
        ? decoration.parallaxX
        : defaults.x,
    y:
      typeof decoration.parallaxY === "number" && Number.isFinite(decoration.parallaxY)
        ? decoration.parallaxY
        : defaults.y,
  };
}

type PixelProtocolWorldProps = {
  gameViewportRef: RefObject<HTMLElement | null>;
  level: LevelDef;
  playerRunFrame: number;
  playerSprite: string;
  portalOpen: boolean;
  grapplePreview:
    | { x: number; y: number; platformId: string; attachSide: "top" | "left" | "right" }
    | null;
  runtime: GameRuntime;
};

export function PixelProtocolWorld({
  gameViewportRef,
  level,
  playerRunFrame,
  playerSprite,
  portalOpen,
  grapplePreview,
  runtime,
}: PixelProtocolWorldProps) {
  const scale = WORLD_RENDER_SCALE;
  const scaled = (value: number) => value * scale;
  const screenX = (value: number) => scaled(value - runtime.cameraX);
  const screenY = (value: number) => scaled(value - runtime.cameraY);
  const now = performance.now();
  const grappling =
    runtime.player.grappleTargetX !== null &&
    runtime.player.grappleTargetY !== null &&
    now < runtime.player.grappleUntil;
  const playerGrappleOrigin = {
    x: runtime.player.x + runtime.player.w / 2,
    y: runtime.player.y + runtime.player.h * 0.28,
  };
  const grappleCable = grappling
    ? {
        dx: runtime.player.grappleTargetX! - playerGrappleOrigin.x,
        dy: runtime.player.grappleTargetY! - playerGrappleOrigin.y,
      }
    : null;
  const anchors = grappleAnchors(runtime.platforms);
  const groundY = levelGroundY(level);
  const yOffset = levelTopPadding(level);
  const decorations: DecorationDef[] = level.decorations ?? [];
  const orbStyle = (orb: GameRuntime["orbs"][number]) => {
    if (orb.grantsSkill) {
      const color =
        orb.affinity === "blue"
          ? "#52c7ff"
          : orb.affinity === "red"
            ? "#ff7869"
            : orb.affinity === "green"
              ? "#63f3a0"
              : "#d66fff";
      return {
        border: `1px solid ${color}`,
        boxShadow: `0 0 14px ${color}`,
      };
    }
    return undefined;
  };

  return (
    <section ref={gameViewportRef} className="pp-game">
      <div
        className="pp-world"
        style={{
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <div
          className="pp-ground"
          style={{ top: screenY(groundY), left: 0, width: "100%", height: scaled(32) }}
        />

        {decorations.map((decoration) => (
          (() => {
            const parallax = resolveDecorationParallax(decoration);
            return (
              <PixelProtocolDecoration
                key={decoration.id}
                decoration={{
                  ...decoration,
                  x: scaled(decoration.x - runtime.cameraX * parallax.x),
                  y:
                    scaled(
                      decoration.y +
                      yOffset +
                      - runtime.cameraY * parallax.y
                    ),
                  width: scaled(decoration.width),
                  height: scaled(decoration.height),
                }}
              />
            );
          })()
        ))}

        {grappleCable && (
          <div
            className="pp-grappleCable"
            style={{
              left: screenX(playerGrappleOrigin.x),
              top: screenY(playerGrappleOrigin.y),
              width: scaled(Math.hypot(grappleCable.dx, grappleCable.dy)),
              transform: `rotate(${Math.atan2(grappleCable.dy, grappleCable.dx)}rad)`,
            }}
          />
        )}

        {anchors.map((anchor) => (
          <div
            key={`anchor-${anchor.platformId}`}
            className={`pp-grappleAnchor ${
              grapplePreview &&
              grapplePreview.platformId === anchor.platformId &&
              grapplePreview.x === anchor.x &&
              grapplePreview.y === anchor.y
                ? "pp-grappleAnchor--target"
                : ""
            }`}
            style={{ left: screenX(anchor.x - 8), top: screenY(anchor.y - 8) }}
          />
        ))}

        {runtime.platforms.flatMap((platform) =>
          platformBlocks(platform).map((block, index) => (
            <div
              key={`${platform.id}-${index}-${platform.currentRotation}-${platform.active ? 1 : 0}`}
              className={`pp-platform ${PLATFORM_CLASS[platform.type]} ${
                platform.temporary ? "pp-platform--temporary" : ""
              } ${
                platform.active ? "" : "pp-platform--off"
              }`}
              style={{
                left: screenX(block.x),
                top: screenY(block.y),
                width: scaled(block.w),
                height: scaled(block.h),
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
              style={{
                left: screenX(orb.x),
                top: screenY(orb.y),
                width: scaled(18),
                height: scaled(18),
                ...orbStyle(orb),
              }}
            />
          ))}

        {runtime.checkpoints.map((checkpoint) => (
          <div
            key={checkpoint.id}
            className={`pp-checkpoint ${
              checkpoint.activated ? "pp-checkpoint--active" : ""
            }`}
            style={{
              left: screenX(checkpoint.x),
              top: screenY(checkpoint.y),
              width: scaled(12),
              height: scaled(42),
              ["--pp-checkpoint-scale" as string]: `${scale}`,
            }}
          />
        ))}

        <div
          className={`pp-portal ${portalOpen ? "pp-portal--open" : ""}`}
          style={{
            left: screenX(level.portal.x),
            top: screenY(level.portal.y + yOffset),
            width: scaled(34),
            height: scaled(44),
          }}
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
                left: screenX(enemy.x - (enemyVisualSize - 26) / 2),
                top: screenY(enemy.y - (enemyVisualSize - 26)),
                width: scaled(enemyVisualSize),
                height: scaled(enemyVisualSize),
                backgroundImage: `url(${enemySprite})`,
                transform: `scaleX(${enemy.vx >= 0 ? 1 : -1})`,
              }}
            />
          );
        })}

        <div
          className={`pp-player ${
            runtime.player.invulnUntil > now ? "pp-player--invuln" : ""
          } ${runtime.player.phaseShiftUntil > now ? "pp-player--phase" : ""} ${
            runtime.player.overclockUntil > now ? "pp-player--overclock" : ""
          } ${runtime.player.corruptedUntil > now ? "pp-player--corrupted" : ""} ${
            runtime.player.gravityInvertedUntil > now ? "pp-player--gravity-invert" : ""
          }`}
          style={{
            left: screenX(
              runtime.player.x - (runtime.player.w * (PLAYER_VISUAL_SCALE - 1)) / 2
            ),
            top: screenY(
              runtime.player.y - runtime.player.h * (PLAYER_VISUAL_SCALE - 1)
            ),
            width: scaled(runtime.player.w * PLAYER_VISUAL_SCALE),
            height: scaled(runtime.player.h * PLAYER_VISUAL_SCALE),
            backgroundImage: `url(${playerSprite})`,
            transform:
              runtime.player.gravityInvertedUntil > now
                ? `scaleX(${runtime.player.facing}) rotate(180deg)`
                : `scaleX(${runtime.player.facing})`,
            zIndex: 3 + playerRunFrame,
          }}
        />
      </div>
    </section>
  );
}
