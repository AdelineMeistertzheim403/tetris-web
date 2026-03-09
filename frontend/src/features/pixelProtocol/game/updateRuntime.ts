import { allCollisionBlocks } from "../logic";
import type {
  AbilityFlags,
  GameRuntime,
  InputSnapshot,
  LevelDef,
} from "../types";
import { updateEnemies } from "./updateEnemies";
import { collectCheckpoints, collectOrbs, handlePortal } from "./updateObjectives";
import {
  applyHackPulse,
  applyUnlockedSkills,
  handleFloorAndRespawn,
  updatePlayer,
} from "./updatePlayer";
import { updatePlatforms } from "./updatePlatforms";

type UpdateRuntimeParams = {
  ability: AbilityFlags;
  dt: number;
  game: GameRuntime;
  input: InputSnapshot;
  level: LevelDef;
  now: number;
  onAdvanceLevel: () => void;
  viewportHeight: number;
  viewportWidth: number;
};

export function updateRuntime({
  ability,
  dt,
  game,
  input,
  level,
  now,
  onAdvanceLevel,
  viewportHeight,
  viewportWidth,
}: UpdateRuntimeParams) {
  game.history.push({
    at: now,
    x: game.player.x,
    y: game.player.y,
    vx: game.player.vx,
    vy: game.player.vy,
    facing: game.player.facing,
    grounded: game.player.grounded,
    jumpsLeft: game.player.jumpsLeft,
    hp: game.player.hp,
  });
  game.history = game.history.filter((entry) => now - entry.at <= 2600);

  // Une frame s'execute toujours dans le meme ordre pour garder une physique et des interactions deterministes.
  updatePlatforms(game, now, dt);

  const blocks = allCollisionBlocks(game.platforms, level);

  applyUnlockedSkills({ ability, game, input, now });
  applyHackPulse({ ability, game, input, now });
  updatePlayer({
    ability,
    blocks,
    dt,
    game,
    input,
    level,
    now,
    viewportHeight,
    viewportWidth,
  });
  handleFloorAndRespawn(game, input.wantRespawn, now, level);
  collectCheckpoints(game);
  collectOrbs(game);
  updateEnemies({ ability, blocks, dt, game, now });
  handlePortal({ game, level, onAdvanceLevel });

  if (game.player.hp <= 0) {
    game.status = "lost";
    game.message = "Pixel a ete desynchronise.";
  }
}
