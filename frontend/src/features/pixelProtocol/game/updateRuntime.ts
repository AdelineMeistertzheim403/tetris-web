import { allCollisionBlocks } from "../logic";
import type {
  AbilityFlags,
  GameRuntime,
  InputSnapshot,
  LevelDef,
} from "../types";
import { updateEnemies } from "./updateEnemies";
import { collectCheckpoints, collectOrbs, handlePortal } from "./updateObjectives";
import { applyHackPulse, handleFloorAndRespawn, updatePlayer } from "./updatePlayer";
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
  // Une frame s'execute toujours dans le meme ordre pour garder une physique et des interactions deterministes.
  updatePlatforms(game, now);

  const blocks = allCollisionBlocks(game.platforms, level.worldWidth);

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
  handleFloorAndRespawn(game, input.wantRespawn, now);
  collectCheckpoints(game);
  collectOrbs(game);
  updateEnemies({ ability, blocks, dt, game, now });
  handlePortal({ game, level, onAdvanceLevel });

  if (game.player.hp <= 0) {
    game.status = "lost";
    game.message = "Pixel a ete desynchronise.";
  }
}
