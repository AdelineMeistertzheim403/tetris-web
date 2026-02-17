import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BrickfallBoard from "../../brickfallVersus/components/BrickfallBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { BRICKFALL_BALANCE } from "../../brickfallVersus/config/balance";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import type { BrickfallLevel } from "../types/levels";
import { findCustomLevel, listCustomLevels, mergeCustomLevels } from "../utils/customLevels";
import {
  CAMPAIGN_TOTAL_LEVELS,
  getCampaignLevel,
} from "../data/campaignLevels";
import {
  fetchBrickfallSoloCustomLevels,
  fetchBrickfallSoloProgress,
  saveBrickfallSoloProgress,
} from "../services/brickfallSoloService";
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

export default function BrickfallSoloPlay() {
  const [searchParams] = useSearchParams();
  const { checkAchievements, updateStats } = useAchievements();
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
  const [spawnType, setSpawnType] = useState<SpawnType | null>(null);
  const [spawnToken, setSpawnToken] = useState(0);
  const [isCustomLevel, setIsCustomLevel] = useState(false);
  const [roundNote, setRoundNote] = useState<string | null>(null);
  const [savedCampaignLevel, setSavedCampaignLevel] = useState(() => readLocalProgress());
  const visitedRef = useRef(false);
  const levelStartRef = useRef(Date.now());
  const multiBallLevelRef = useRef(0);
  const malusLevelRef = useRef(0);
  const debuffTimerRef = useRef<number | null>(null);

  const worldStage = useMemo(() => toWorldStage(levelIndex), [levelIndex]);
  const customParam = searchParams.get("custom");
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
  const guaranteedDropBlocks = useMemo(
    () =>
      level.bricks
        .filter((b) => b.type === "bonus")
        .map((b) => ({ x: b.x, y: b.y, drop: toBonusDropType(b.drop) })),
    [level.bricks]
  );

  const applyDebuff = (nextDebuff: string, durationMs = 5000) => {
    setDebuff(nextDebuff);
    if (debuffTimerRef.current !== null) {
      window.clearTimeout(debuffTimerRef.current);
    }
    debuffTimerRef.current = window.setTimeout(() => {
      setDebuff(null);
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
  }, [customParam, levelParam]);

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
    const campaignClear = levelIndex >= TOTAL_LEVELS && !isCustomLevel;
    const worldOneClear = !isCustomLevel && levelIndex >= LEVELS_PER_WORLD;

    const next = updateStats((prev) => ({
      ...prev,
      brickfallSoloLevelsCleared: prev.brickfallSoloLevelsCleared + (isCustomLevel ? 0 : 1),
      brickfallSoloBlocksDestroyed: prev.brickfallSoloBlocksDestroyed + destroyedThisLevel,
      brickfallSoloBestWorld: Math.max(prev.brickfallSoloBestWorld, worldStage.world),
      brickfallSoloCampaignCleared: prev.brickfallSoloCampaignCleared || campaignClear,
      brickfallSoloEditorWins: prev.brickfallSoloEditorWins + (isCustomLevel ? 1 : 0),
      scoredModes: { ...prev.scoredModes, BRICKFALL_SOLO: true },
    }));

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

    if (campaignClear) {
      const capped = TOTAL_LEVELS;
      if (capped > savedCampaignLevel) {
        setSavedCampaignLevel(capped);
        writeLocalProgress(capped);
        void saveBrickfallSoloProgress(capped).catch(() => {});
      }
      setStatus("campaign_clear");
      return;
    }

    if (!isCustomLevel) {
      const unlocked = clamp(levelIndex + 1, 1, TOTAL_LEVELS);
      if (unlocked > savedCampaignLevel) {
        setSavedCampaignLevel(unlocked);
        writeLocalProgress(unlocked);
        void saveBrickfallSoloProgress(unlocked).catch(() => {});
      }
    }

    setStatus("level_clear");
    setRoundNote(
      `Niveau termine en ${(durationMs / 1000).toFixed(1)}s - ${destroyedThisLevel} blocs detruits`
    );
  };

  return (
    <div className="brickfall-solo-play font-['Press_Start_2P']">
      <h1 className="text-3xl text-yellow-400 mb-3 text-center">Brickfall Solo</h1>
      <p className="text-xs text-cyan-200 mb-5 text-center">
        {level.name} - Blocs restants: {remainingBlocks} - Vies: {lives}
      </p>

      <div className="brickfall-solo-play-layout">
        <aside className="panel brickfall-solo-play-hud text-left text-xs">
          <div className="brickfall-solo-hud-title">HUD campagne</div>
          <div className="brickfall-solo-hud-line">Monde: <span>{worldStage.world}</span></div>
          <div className="brickfall-solo-hud-line">Niveau: <span>{worldStage.stage}</span></div>
          <div className="brickfall-solo-hud-line">Progression: <span>{Math.min(levelIndex, TOTAL_LEVELS)}/{TOTAL_LEVELS}</span></div>
          <div className="brickfall-solo-hud-line">Sauvegarde: <span>{savedCampaignLevel}</span></div>
          <div className="brickfall-solo-hud-line">Debuff actif: <span>{debuff ?? "-"}</span></div>
          <div className="brickfall-solo-hud-line">Multi-ball: <span>{multiBallLevelRef.current}</span></div>
          <div className="brickfall-solo-hud-line">Malus: <span>{malusLevelRef.current}</span></div>
          {roundNote && <div className="brickfall-solo-hud-note">{roundNote}</div>}
        </aside>

        <div className="brickfall-solo-play-board">
          <BrickfallBoard
            rows={ROWS}
            cols={COLS}
            cellSize={30}
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
            <button
              className="retro-btn"
              onClick={() => {
                if (isCustomLevel) {
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
            <button className="retro-btn" onClick={() => loadLevel(levelIndex, isCustomLevel ? level : null)}>
              Rejouer
            </button>
          </div>
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
          <button className="retro-btn" onClick={() => loadLevel(levelIndex, isCustomLevel ? level : null)}>
            Reessayer
          </button>
        </div>
      </FullScreenOverlay>
    </div>
  );
}
