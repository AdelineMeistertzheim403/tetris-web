import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "../../../routes/paths";
import { useAuth } from "../../auth/context/AuthContext";
import BrickfallBoard from "../../brickfall/components/BrickfallBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { BRICKFALL_BALANCE } from "../../brickfall/shared/balance";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import type { BrickfallLevel } from "../types/levels";
import { findCustomLevel, listCustomLevels, mergeCustomLevels } from "../utils/customLevels";
import {
  CAMPAIGN_TOTAL_LEVELS,
  getCampaignLevel,
} from "../data/campaignLevels";
import {
  fetchBrickfallSoloCommunityLevel,
  fetchBrickfallSoloCustomLevels,
  fetchBrickfallSoloProgress,
  saveBrickfallSoloProgress,
  toggleBrickfallSoloCommunityLevelLike,
  type BrickfallSoloCommunityLevel,
} from "../services/brickfallSoloService";
import { markBrickfallSoloCustomLevelCompleted } from "../utils/communityCompletion";
import "../../../styles/roguelike.css";
import "../../../styles/brickfall-solo-play.css";

type SpawnType = "normal" | "armored" | "bomb" | "cursed" | "mirror";
type BonusDropType =
  | "multi_ball"
  | "piercing"
  | "paddle_extend"
  | "slow_motion"
  | "chaotic_ball"
  | "random";
type ActivePowerUpType = "piercing" | "paddle_extend" | "slow_motion" | "chaotic_ball";
type ActivePowerUp = { type: ActivePowerUpType; remainingMs: number };

const ROWS = 20;
const COLS = 25;
const LEVELS_PER_WORLD = 9;
const TOTAL_LEVELS = CAMPAIGN_TOTAL_LEVELS;
const PROGRESS_STORAGE_KEY = "brickfall-solo-campaign-progress-v1";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function modeCount(values: Record<string, boolean>) {
  return Object.values(values).filter(Boolean).length;
}

function toWorldStage(index: number) {
  const world = Math.floor((index - 1) / LEVELS_PER_WORLD) + 1;
  const stage = ((index - 1) % LEVELS_PER_WORLD) + 1;
  return { world, stage };
}

function readLocalProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return 1;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return 1;
    return clamp(parsed, 1, TOTAL_LEVELS);
  } catch {
    return 1;
  }
}

function writeLocalProgress(level: number) {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, String(clamp(level, 1, TOTAL_LEVELS)));
  } catch {
    // no-op
  }
}

function levelToBoard(level: BrickfallLevel) {
  const board = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  for (const brick of level.bricks) {
    if (brick.y < 0 || brick.y >= ROWS || brick.x < 0 || brick.x >= COLS) continue;
    // BrickfallBoard inverse deja l'axe Y au rendu.
    // On stocke ici en coordonnees "top-origin" puis on remappe.
    const mappedY = ROWS - 1 - brick.y;
    board[mappedY][brick.x] = 1;
  }
  return board;
}

function buildSpawnPlan(level: BrickfallLevel): SpawnType[] {
  const plan: SpawnType[] = [];
  const armor = level.bricks.filter((b) => b.type === "armor").length;
  const malus = level.bricks.filter((b) => b.type === "malus").length;
  const explosive = level.bricks.filter((b) => b.type === "explosive").length;
  for (let i = 0; i < Math.floor(armor / 2); i += 1) plan.push("armored");
  for (let i = 0; i < Math.ceil(malus / 2); i += 1) plan.push("cursed");
  for (let i = 0; i < Math.max(1, explosive); i += 1) plan.push("bomb");
  if (level.boss) plan.push("mirror");
  return plan.slice(0, 7);
}

function toBonusDropType(value: string | undefined): BonusDropType | undefined {
  if (
    value === "multi_ball" ||
    value === "piercing" ||
    value === "paddle_extend" ||
    value === "slow_motion" ||
    value === "chaotic_ball" ||
    value === "random"
  ) {
    return value;
  }
  return undefined;
}

function formatPowerUp(type: ActivePowerUpType): string {
  if (type === "piercing") return "Balle perforante";
  if (type === "paddle_extend") return "Raquette XL";
  if (type === "slow_motion") return "Ralenti";
  return "Balle chaotique";
}

function formatDebuff(value: string): string {
  if (value === "paddle_shrink") return "Raquette reduite";
  if (value === "slow") return "Lenteur";
  if (value === "random_gravity") return "Gravite aleatoire";
  if (value === "invert_controls") return "Controles inverses";
  return value;
}

export default function BrickfallSoloPlay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { checkAchievements, updateStats, recordPlayerBehavior, recordTetrobotEvent } =
    useAchievements();
  const startLives = BRICKFALL_BALANCE.demolisher.startLives;
  const [levelIndex, setLevelIndex] = useState(1);
  const [level, setLevel] = useState<BrickfallLevel>(() => getCampaignLevel(1));
  const [targetBoard, setTargetBoard] = useState<number[][]>(() => levelToBoard(getCampaignLevel(1)));
  const [remainingBlocks, setRemainingBlocks] = useState(0);
  const [destroyedThisLevel, setDestroyedThisLevel] = useState(0);
  const [lives, setLives] = useState(startLives);
  const [debuff, setDebuff] = useState<string | null>(null);
  const [status, setStatus] = useState<"playing" | "level_clear" | "game_over" | "campaign_clear">(
    "playing"
  );
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [debuffUntil, setDebuffUntil] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [spawnType, setSpawnType] = useState<SpawnType | null>(null);
  const [spawnToken, setSpawnToken] = useState(0);
  const [isCustomLevel, setIsCustomLevel] = useState(false);
  const [communityLevel, setCommunityLevel] = useState<BrickfallSoloCommunityLevel | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [communityLikeBusy, setCommunityLikeBusy] = useState(false);
  const [roundNote, setRoundNote] = useState<string | null>(null);
  const [savedCampaignLevel, setSavedCampaignLevel] = useState(() => readLocalProgress());
  const visitedRef = useRef(false);
  const levelStartRef = useRef(Date.now());
  const multiBallLevelRef = useRef(0);
  const malusLevelRef = useRef(0);
  const debuffTimerRef = useRef<number | null>(null);

  const worldStage = useMemo(() => toWorldStage(levelIndex), [levelIndex]);
  const customParam = searchParams.get("custom");
  const communityParam = searchParams.get("community");
  const levelParamRaw = searchParams.get("level");
  const levelParam = levelParamRaw ? clamp(Number.parseInt(levelParamRaw, 10) || 1, 1, TOTAL_LEVELS) : null;
  const specialBlocks = useMemo(
    () =>
      level.bricks
        .map((b) => {
          if (b.type === "armor") {
            return { x: b.x, y: b.y, type: "armored" as const, hp: b.hp ?? 3 };
          }
          if (b.type === "explosive") {
            return { x: b.x, y: b.y, type: "bomb" as const, hp: 1 };
          }
          if (b.type === "malus") {
            return { x: b.x, y: b.y, type: "cursed" as const, hp: 1 };
          }
          if (b.type === "cursed") {
            return { x: b.x, y: b.y, type: "cursed" as const, hp: 1 };
          }
          if (b.type === "mirror") {
            return { x: b.x, y: b.y, type: "mirror" as const, hp: 1 };
          }
          return null;
        })
        .filter((v): v is { x: number; y: number; type: "armored" | "bomb" | "cursed" | "mirror"; hp: number } =>
          Boolean(v)
        ),
    [level.bricks]
  );
  const isCommunityLevel = Boolean(communityLevel);
  const guaranteedDropBlocks = useMemo(
    () =>
      level.bricks
        .filter((b) => b.type === "bonus")
        .map((b) => ({ x: b.x, y: b.y, drop: toBonusDropType(b.drop) })),
    [level.bricks]
  );

  const applyDebuff = (nextDebuff: string, durationMs = 5000) => {
    setDebuff(nextDebuff);
    setDebuffUntil(Date.now() + durationMs);
    if (debuffTimerRef.current !== null) {
      window.clearTimeout(debuffTimerRef.current);
    }
    debuffTimerRef.current = window.setTimeout(() => {
      setDebuff(null);
      setDebuffUntil(null);
      debuffTimerRef.current = null;
    }, durationMs);
  };

  const loadLevel = (nextIndex: number, customLevel?: BrickfallLevel | null) => {
    const nextLevel = customLevel ?? getCampaignLevel(nextIndex);
    setLevel(nextLevel);
    setTargetBoard(levelToBoard(nextLevel));
    setRemainingBlocks(nextLevel.bricks.length);
    setDestroyedThisLevel(0);
    setLives(startLives);
    setDebuff(null);
    setDebuffUntil(null);
    setActivePowerUps([]);
    setStatus("playing");
    setRoundNote(null);
    setIsCustomLevel(Boolean(customLevel));
    levelStartRef.current = Date.now();
    multiBallLevelRef.current = 0;
    malusLevelRef.current = 0;

    const plan = buildSpawnPlan(nextLevel);
    plan.forEach((type, idx) => {
      window.setTimeout(() => {
        setSpawnType(type);
        setSpawnToken(Date.now() + idx);
      }, 300 + idx * 260);
    });
  };

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      let levels = listCustomLevels();
      let checkpoint = readLocalProgress();
      setSavedCampaignLevel(checkpoint);

      const requestedCommunityId = Number.parseInt(communityParam ?? "", 10);
      if (Number.isFinite(requestedCommunityId) && requestedCommunityId > 0) {
        if (!cancelled) {
          setCommunityLoading(true);
          setCommunityError(null);
        }
        try {
          const remoteCommunityLevel = await fetchBrickfallSoloCommunityLevel(requestedCommunityId);
          if (cancelled) return;
          setCommunityLevel(remoteCommunityLevel);
          setCommunityLoading(false);
          loadLevel(1, remoteCommunityLevel.level);
          return;
        } catch (err) {
          if (!cancelled) {
            setCommunityLevel(null);
            setCommunityLoading(false);
            setCommunityError(err instanceof Error ? err.message : "Niveau joueur introuvable");
            navigate(PATHS.brickfallSolo);
          }
          return;
        }
      }

      try {
        const remoteLevels = await fetchBrickfallSoloCustomLevels();
        levels = mergeCustomLevels(remoteLevels);
      } catch {
        // non bloquant
      }

      try {
        const remoteProgress = await fetchBrickfallSoloProgress();
        checkpoint = Math.max(checkpoint, remoteProgress);
        writeLocalProgress(checkpoint);
      } catch {
        // non bloquant
      }

      if (cancelled) return;
      setSavedCampaignLevel(checkpoint);
      setCommunityLevel(null);
      setCommunityError(null);

      if (customParam) {
        const fromParam = levels.find((lvl) => lvl.id === customParam) ?? findCustomLevel(customParam);
        if (fromParam) {
          loadLevel(1, fromParam);
          return;
        }
      }

      const startLevel = levelParam ?? checkpoint;
      setLevelIndex(startLevel);
      loadLevel(startLevel, null);
    };

    bootstrap();
    return () => {
      cancelled = true;
      if (debuffTimerRef.current !== null) {
        window.clearTimeout(debuffTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityParam, customParam, levelParam, navigate]);

  useEffect(() => {
    if (!debuffUntil) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [debuffUntil]);

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, BRICKFALL_SOLO: true },
    }));
    checkAchievements({
      custom: {
        modes_visited_all: modeCount(next.modesVisited) >= TOTAL_GAME_MODES,
      },
    });
  }, [checkAchievements, updateStats]);

  const onLevelCleared = () => {
    if (status !== "playing") return;
    const durationMs = Date.now() - levelStartRef.current;
    const noMiss = lives >= startLives;
    const campaignClear = levelIndex >= TOTAL_LEVELS && !isCustomLevel && !isCommunityLevel;
    const worldOneClear = !isCustomLevel && !isCommunityLevel && levelIndex >= LEVELS_PER_WORLD;

    const next = updateStats((prev) => ({
      ...prev,
      brickfallSoloLevelsCleared: prev.brickfallSoloLevelsCleared + (isCustomLevel || isCommunityLevel ? 0 : 1),
      brickfallSoloBlocksDestroyed: prev.brickfallSoloBlocksDestroyed + destroyedThisLevel,
      brickfallSoloBestWorld: Math.max(prev.brickfallSoloBestWorld, worldStage.world),
      brickfallSoloCampaignCleared: prev.brickfallSoloCampaignCleared || campaignClear,
      brickfallSoloEditorWins: prev.brickfallSoloEditorWins + (isCustomLevel ? 1 : 0),
      scoredModes: { ...prev.scoredModes, BRICKFALL_SOLO: true },
      counters: {
        ...prev.counters,
        bf_solo_no_miss_wins:
          (prev.counters.bf_solo_no_miss_wins ?? 0) + (noMiss ? 1 : 0),
        bf_solo_under_45s_wins:
          (prev.counters.bf_solo_under_45s_wins ?? 0) + (durationMs <= 45_000 ? 1 : 0),
        bf_solo_max_multiballs_run: Math.max(
          prev.counters.bf_solo_max_multiballs_run ?? 0,
          multiBallLevelRef.current
        ),
        bf_solo_max_malus_run: Math.max(
          prev.counters.bf_solo_max_malus_run ?? 0,
          malusLevelRef.current
        ),
      },
    }));

    recordPlayerBehavior({
      mode: "BRICKFALL_SOLO",
      won: true,
      durationMs,
      mistakes: [
        ...(noMiss ? [] : (["damage_taken"] as const)),
        ...(durationMs > 60_000 ? (["slow"] as const) : []),
      ],
      runContext: {
        livesRemaining: lives,
        pressureScore: Math.round(
          Math.min(100, (startLives - lives) * 28 + malusLevelRef.current * 12)
        ),
        stageIndex: levelIndex,
      },
    });
    if (noMiss && durationMs <= 60_000) {
      recordTetrobotEvent({ type: "rookie_tip_followed" });
    }
    if (
      next.brickfallSoloLevelsCleared === 1 ||
      worldOneClear ||
      next.brickfallSoloCampaignCleared
    ) {
      recordTetrobotEvent({ type: "pulse_advice_success" });
    }

    checkAchievements({
      mode: "BRICKFALL_SOLO",
      custom: {
        bf_solo_1_clear: next.brickfallSoloLevelsCleared >= 1,
        bf_solo_world1_clear: worldOneClear,
        bf_solo_campaign_clear: next.brickfallSoloCampaignCleared,
        bf_solo_no_miss: noMiss,
        bf_solo_1000_blocks: next.brickfallSoloBlocksDestroyed >= 1000,
        bf_solo_under_45s: durationMs <= 45_000,
        bf_solo_3_multiballs: multiBallLevelRef.current >= 3,
        bf_solo_3_malus_win: malusLevelRef.current >= 3,
        bf_editor_win: isCustomLevel,
        scored_all_modes: modeCount(next.scoredModes) >= TOTAL_SCORED_MODES,
      },
    });

    if (isCustomLevel) {
      markBrickfallSoloCustomLevelCompleted(level);
    }

    if (campaignClear) {
      const capped = TOTAL_LEVELS;
      if (capped > savedCampaignLevel) {
        setSavedCampaignLevel(capped);
        writeLocalProgress(capped);
        void saveBrickfallSoloProgress(capped).catch(() => { });
      }
      setStatus("campaign_clear");
      return;
    }

    if (!isCustomLevel && !isCommunityLevel) {
      const unlocked = clamp(levelIndex + 1, 1, TOTAL_LEVELS);
      if (unlocked > savedCampaignLevel) {
        setSavedCampaignLevel(unlocked);
        writeLocalProgress(unlocked);
        void saveBrickfallSoloProgress(unlocked).catch(() => { });
      }
    }

    setStatus("level_clear");
    setRoundNote(
      `Niveau termine en ${(durationMs / 1000).toFixed(1)}s - ${destroyedThisLevel} blocs detruits`
    );
  };

  const handleCommunityLike = async () => {
    if (!user || !communityLevel || communityLevel.isOwn || communityLikeBusy) return;
    setCommunityLikeBusy(true);
    try {
      const result = await toggleBrickfallSoloCommunityLevelLike(communityLevel.id);
      setCommunityLevel({
        ...communityLevel,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      });
      setCommunityError(null);
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : "Vote impossible");
    } finally {
      setCommunityLikeBusy(false);
    }
  };

  if (communityLoading) {
    return (
      <div className="brickfall-solo-play font-['Press_Start_2P']">
        <h1 className="text-3xl text-yellow-400 mb-3 text-center">Brickfall Solo</h1>
        <p className="text-xs text-cyan-200 mb-5 text-center">Chargement du niveau joueur...</p>
      </div>
    );
  }

  return (
    <div className="brickfall-solo-play font-['Press_Start_2P']">
      <h1 className="text-3xl text-yellow-400 mb-3 text-center">Brickfall Solo</h1>
      <p className="text-xs text-cyan-200 mb-5 text-center">
        {level.name} - Blocs restants: {remainingBlocks} - Vies: {lives}
      </p>
      {communityLevel && (
        <p className="text-xs text-pink-200 mb-3 text-center">
          Niveau joueur par {communityLevel.authorPseudo} - {communityLevel.likeCount} like{communityLevel.likeCount > 1 ? "s" : ""}
        </p>
      )}

      <div className="brickfall-solo-play-layout">
        <aside className="panel brickfall-solo-play-hud text-left text-xs">
          <div className="brickfall-solo-hud-title">HUD campagne</div>
          <div className="brickfall-solo-hud-line">Monde: <span>{worldStage.world}</span></div>
          <div className="brickfall-solo-hud-line">Niveau: <span>{worldStage.stage}</span></div>
          <div className="brickfall-solo-hud-line">Progression: <span>{Math.min(levelIndex, TOTAL_LEVELS)}/{TOTAL_LEVELS}</span></div>
          {!communityLevel && <div className="brickfall-solo-hud-line">Sauvegarde: <span>{savedCampaignLevel}</span></div>}
          <div className="brickfall-solo-hud-line">
            Bonus actifs:
            <span>
              {activePowerUps.length > 0
                ? activePowerUps
                  .map((effect) => `${formatPowerUp(effect.type)} (${Math.max(1, Math.ceil(effect.remainingMs / 1000))}s)`)
                  .join(", ")
                : "-"}
            </span>
          </div>
          <div className="brickfall-solo-hud-line">
            Malus actif:
            <span>
              {debuff
                ? `${formatDebuff(debuff)}${debuffUntil ? ` (${Math.max(1, Math.ceil((debuffUntil - nowMs) / 1000))}s)` : ""}`
                : "-"}
            </span>
          </div>
          <div className="brickfall-solo-hud-line">Multi-ball: <span>{multiBallLevelRef.current}</span></div>
          <div className="brickfall-solo-hud-line">Malus: <span>{malusLevelRef.current}</span></div>
          {roundNote && <div className="brickfall-solo-hud-note">{roundNote}</div>}
        </aside>

        <div className="brickfall-solo-play-board">
          <BrickfallBoard
            rows={ROWS}
            cols={COLS}
            cellWidth={54}
            cellHeight={34}
            targetBoard={targetBoard}
            initialSpecialBlocks={specialBlocks}
            guaranteedDropBlocks={guaranteedDropBlocks}
            interactive
            canLaunch={status === "playing"}
            paused={status !== "playing"}
            debuff={debuff}
            spawnBlockType={spawnType}
            spawnToken={spawnToken}
            onBlocksDestroyed={(count) => setDestroyedThisLevel((prev) => prev + count)}
            onBlockDestroyedAt={({ x, y }) => {
              setTargetBoard((prev) => {
                if (!prev[y]?.[x]) return prev;
                const next = prev.map((row) => [...row]);
                next[y][x] = 0;
                return next;
              });
              setRemainingBlocks((prev) => {
                const next = Math.max(0, prev - 1);
                if (next === 0) window.setTimeout(onLevelCleared, 80);
                return next;
              });
            }}
            onLifeDepleted={() => {
              if (status !== "playing") return;
              setStatus("game_over");
            }}
            onLivesChange={setLives}
            onPowerUpActivated={(type) => {
              if (type === "multi_ball") multiBallLevelRef.current += 1;
            }}
            onEffectsChange={(effects) => {
              setActivePowerUps(effects.powerUps);
            }}
            onCursedHit={() => {
              malusLevelRef.current += 1;
              const malusPool = ["paddle_shrink", "slow", "random_gravity"];
              applyDebuff(malusPool[randInt(0, malusPool.length - 1)], 5500);
            }}
            onMirrorHit={() => {
              malusLevelRef.current += 1;
              applyDebuff("invert_controls", 4500);
            }}
          />
        </div>
      </div>

      <FullScreenOverlay show={status === "level_clear"}>
        <div className="text-center text-yellow-300">
          <h2 className="text-2xl mb-4">Niveau termine</h2>
          <div className="flex gap-3 justify-center">
            {communityLevel && (
              <button
                className="retro-btn"
                onClick={() => void handleCommunityLike()}
                disabled={!user || communityLevel.isOwn || communityLikeBusy}
              >
                {communityLevel.isOwn ? "Ton niveau" : communityLevel.likedByMe ? "Retirer like" : "Liker"}
              </button>
            )}
            <button
              className="retro-btn"
              onClick={() => {
                if (isCustomLevel || communityLevel) {
                  loadLevel(levelIndex, level);
                  return;
                }
                const nextIndex = clamp(levelIndex + 1, 1, TOTAL_LEVELS);
                setLevelIndex(nextIndex);
                loadLevel(nextIndex, null);
              }}
            >
              {isCustomLevel ? "Rejouer custom" : "Niveau suivant"}
            </button>
            <button className="retro-btn" onClick={() => loadLevel(levelIndex, isCustomLevel || isCommunityLevel ? level : null)}>
              Rejouer
            </button>
            <button className="retro-btn" onClick={() => navigate(PATHS.brickfallSolo)}>
              Quitter
            </button>
          </div>
          {communityError && <p className="mt-3 text-xs text-red-300">{communityError}</p>}
        </div>
      </FullScreenOverlay>

      <FullScreenOverlay show={status === "campaign_clear"}>
        <div className="text-center text-yellow-300">
          <h2 className="text-2xl mb-4">Campagne complete</h2>
          <button
            className="retro-btn"
            onClick={() => {
              setLevelIndex(1);
              loadLevel(1, null);
            }}
          >
            Recommencer
          </button>
        </div>
      </FullScreenOverlay>

      <FullScreenOverlay show={status === "game_over"}>
        <div className="text-center text-yellow-300">
          <h2 className="text-2xl mb-4">Game Over</h2>
          <div className="flex gap-3 justify-center">
            <button className="retro-btn" onClick={() => loadLevel(levelIndex, isCustomLevel ? level : null)}>
              Reessayer
            </button>
            <button className="retro-btn" onClick={() => navigate(PATHS.brickfallSolo)}>
              Quitter
            </button>
          </div>
        </div>
      </FullScreenOverlay>
    </div>
  );
}
