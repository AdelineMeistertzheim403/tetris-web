import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths";
import AchievementToast from "../../achievements/components/AchievementToast";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import type {
  PlayerRunTimelineSample,
  PlayerRunTimelineTag,
} from "../../achievements/types/tetrobots";
import { addScore, getMyScores, getScoreRunToken } from "../../game/services/scoreService";
import { GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import { usePixelMode } from "../../pixelMode/hooks/usePixelMode";
import { useAutoClearRecentAchievements } from "../../roguelike/hooks/useAutoClearRecentAchievements";
import "../../../styles/pixel-invasion.css";
import { PixelInvasionBoard } from "../components/PixelInvasionBoard";
import { PixelInvasionSidebar } from "../components/PixelInvasionSidebar";
import { usePixelInvasionAudio } from "../hooks/usePixelInvasionAudio";
import { usePixelInvasionGame } from "../hooks/usePixelInvasionGame";
import { createStars } from "../model";
import type { GameState } from "../model";
import {
  fetchPixelInvasionProgress,
  savePixelInvasionProgress,
} from "../services/pixelInvasionService";

const PIXEL_INVASION_MODE = "PIXEL_INVASION";
const PIXEL_INVASION_BEST_SCORE_KEY = "pixel-invasion-best-score";
const PIXEL_INVASION_BEST_WAVE_KEY = "pixel-invasion-best-wave";
const PIXEL_INVASION_PAUSED_RUN_KEY = "pixel-invasion-paused-run";

type PausedRunSnapshot = {
  version: 1;
  savedAt: string;
  highestWaveReached: number;
  trackedPowerups: string[];
  game: GameState;
};

function countTrue(values: Record<string, boolean>) {
  return Object.values(values).filter(Boolean).length;
}

function isSnapshotGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<GameState>;
  return (
    typeof data.wave === "number" &&
    typeof data.score === "number" &&
    typeof data.lives === "number" &&
    Array.isArray(data.enemies) &&
    Array.isArray(data.scrapGrid)
  );
}

function normalizePausedRunSnapshot(value: unknown): PausedRunSnapshot | null {
  try {
    const parsed = value as Partial<PausedRunSnapshot>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.trackedPowerups) ||
      !isSnapshotGameState(parsed.game)
    ) {
      return null;
    }

    return {
      version: 1,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      highestWaveReached: Math.max(1, Math.floor(parsed.highestWaveReached ?? parsed.game.wave)),
      trackedPowerups: parsed.trackedPowerups.filter((item): item is string => typeof item === "string"),
      game: parsed.game,
    };
  } catch {
    return null;
  }
}

function readPausedRunSnapshot(): PausedRunSnapshot | null {
  try {
    const raw = localStorage.getItem(PIXEL_INVASION_PAUSED_RUN_KEY);
    if (!raw) return null;
    return normalizePausedRunSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function pickNewestSnapshot(
  localSnapshot: PausedRunSnapshot | null,
  remoteSnapshot: PausedRunSnapshot | null
) {
  if (!localSnapshot) return remoteSnapshot;
  if (!remoteSnapshot) return localSnapshot;

  const localTime = Date.parse(localSnapshot.savedAt);
  const remoteTime = Date.parse(remoteSnapshot.savedAt);
  return remoteTime > localTime ? remoteSnapshot : localSnapshot;
}

export default function PixelInvasionPage() {
  const navigate = useNavigate();
  const {
    gameplayRouteActive: pixelModeActive,
    activeRuntimeEvent,
  } = usePixelMode();
  const { game, paused, pauseGame, resumeGame, loadGame, resetGame, shieldRatio } = usePixelInvasionGame();
  const { muted, toggleMute } = usePixelInvasionAudio(game);
  const {
    updateStats,
    checkAchievements,
    recordPlayerBehavior,
    recordTetrobotEvent,
    recentUnlocks,
    clearRecent,
  } = useAchievements();
  const [bestScore, setBestScore] = useState(0);
  const [bestWave, setBestWave] = useState(1);
  const stars = useMemo(() => createStars(), []);
  const startTimeRef = useRef(Date.now());
  const resolvedOutcomeRef = useRef<string | null>(null);
  const visitedModeRef = useRef(false);
  const trackedPowerupsRef = useRef(new Set<string>(["multi_shot"]));
  const waveCheckpointRef = useRef<GameState | null>(null);
  const lastWeaponPowerupRef = useRef<string | null>(null);
  const lastSlowFieldTimerRef = useRef(0);
  const latestWaveRef = useRef(1);
  const timelineSamplesRef = useRef<PlayerRunTimelineSample[]>([]);
  const lastSampledLivesRef = useRef(game.lives);
  const lastSampledWaveRef = useRef(game.wave);
  const lastSampledComboRef = useRef(game.maxCombo);
  const [resumeSnapshot, setResumeSnapshot] = useState<PausedRunSnapshot | null>(null);
  const [quittingRun, setQuittingRun] = useState(false);
  const campaignTone =
    game.wave >= 98
      ? "finale"
      : game.wave >= 95
        ? "apex"
        : game.waveTheme === "rookie"
          ? "rookie"
          : game.waveTheme === "pulse"
            ? "pulse"
            : "apex";
  const pixelAnomaly =
    activeRuntimeEvent?.sourceLabel === "Pixel Invasion" ? activeRuntimeEvent : null;

  useAutoClearRecentAchievements(recentUnlocks, clearRecent);

  const pushTimelineSample = (
    phase: "early" | "mid" | "late",
    tags: PlayerRunTimelineTag[],
    runContext: PlayerRunTimelineSample["runContext"]
  ) => {
    const atMs = Math.max(0, Date.now() - startTimeRef.current);
    const previous = timelineSamplesRef.current[timelineSamplesRef.current.length - 1];
    if (
      previous &&
      previous.phase === phase &&
      previous.tags.join("|") === tags.join("|") &&
      Math.abs((previous.runContext.pressureScore ?? 0) - (runContext.pressureScore ?? 0)) < 8
    ) {
      return;
    }
    timelineSamplesRef.current = [...timelineSamplesRef.current, { atMs, phase, tags, runContext }].slice(-6);
  };

  useEffect(() => {
    if (visitedModeRef.current) return;
    visitedModeRef.current = true;

    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: {
        ...prev.modesVisited,
        [PIXEL_INVASION_MODE]: true,
      },
    }));

    checkAchievements({
      custom: {
        modes_visited_all: countTrue(next.modesVisited) >= GAME_MODES.length,
      },
    });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const localBest = Number.parseInt(
        localStorage.getItem(PIXEL_INVASION_BEST_SCORE_KEY) ?? "0",
        10
      );
      const localBestWave = Number.parseInt(
        localStorage.getItem(PIXEL_INVASION_BEST_WAVE_KEY) ?? "1",
        10
      );
      const normalizedLocalBest = Number.isFinite(localBest) ? Math.max(0, localBest) : 0;
      const normalizedLocalBestWave = Number.isFinite(localBestWave) ? Math.max(1, localBestWave) : 1;

      if (!cancelled) {
        setBestScore(normalizedLocalBest);
        setBestWave(normalizedLocalBestWave);
      }

      const localSnapshot = readPausedRunSnapshot();

      try {
        const progress = await fetchPixelInvasionProgress();
        const scores = await getMyScores(PIXEL_INVASION_MODE);
        const remoteBest = Array.isArray(scores)
          ? scores.reduce(
              (best, entry) =>
                Math.max(best, Number.isFinite(entry?.value) ? Math.floor(entry.value) : 0),
              0
            )
          : 0;
        const mergedBest = Math.max(normalizedLocalBest, progress.bestScore, remoteBest);
        const mergedBestWave = Math.max(normalizedLocalBestWave, progress.highestWave);
        const latestSnapshot = pickNewestSnapshot(
          localSnapshot,
          normalizePausedRunSnapshot(progress.pausedRun)
        );
        localStorage.setItem(PIXEL_INVASION_BEST_SCORE_KEY, String(mergedBest));
        localStorage.setItem(PIXEL_INVASION_BEST_WAVE_KEY, String(mergedBestWave));
        if (latestSnapshot) {
          localStorage.setItem(PIXEL_INVASION_PAUSED_RUN_KEY, JSON.stringify(latestSnapshot));
        }
        if (!cancelled) {
          setBestScore(mergedBest);
          setBestWave(mergedBestWave);
          if (latestSnapshot) {
            pauseGame();
            setResumeSnapshot(latestSnapshot);
          }
        }
      } catch {
        if (!cancelled && localSnapshot) {
          pauseGame();
          setResumeSnapshot(localSnapshot);
        }
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [pauseGame]);

  useEffect(() => {
    latestWaveRef.current = Math.max(latestWaveRef.current, game.wave);
    lastWeaponPowerupRef.current ??= game.weaponPowerup;

    if (game.weaponPowerup !== lastWeaponPowerupRef.current) {
      trackedPowerupsRef.current.add(game.weaponPowerup);
      lastWeaponPowerupRef.current = game.weaponPowerup;
    }

    if (game.slowFieldTimer > lastSlowFieldTimerRef.current + 0.15) {
      trackedPowerupsRef.current.add("slow_field");
    }
    lastSlowFieldTimerRef.current = game.slowFieldTimer;
  }, [game.slowFieldTimer, game.wave, game.weaponPowerup]);

  useEffect(() => {
    const phase = game.wave < 10 ? "early" : game.wave < 25 ? "mid" : "late";
    const pressureScore = Math.round(
      Math.min(100, (3 - game.lives) * 28 + Math.min(40, game.wave))
    );

    if (game.lives < lastSampledLivesRef.current) {
      pushTimelineSample(phase, ["resource_loss", "pressure_spike"], {
        livesRemaining: game.lives,
        comboPeak: game.maxCombo,
        pressureScore,
        stageIndex: game.wave,
      });
    } else if (game.lives > lastSampledLivesRef.current) {
      pushTimelineSample(phase, ["recovery"], {
        livesRemaining: game.lives,
        comboPeak: game.maxCombo,
        pressureScore,
        stageIndex: game.wave,
      });
    }

    if (game.wave >= lastSampledWaveRef.current + 5) {
      pushTimelineSample(phase, ["recovery"], {
        livesRemaining: game.lives,
        comboPeak: game.maxCombo,
        pressureScore: Math.max(0, pressureScore - 12),
        stageIndex: game.wave,
      });
      lastSampledWaveRef.current = game.wave;
    }

    if (game.maxCombo >= 6 && game.maxCombo >= lastSampledComboRef.current + 2) {
      pushTimelineSample(phase, ["execution_peak"], {
        livesRemaining: game.lives,
        comboPeak: game.maxCombo,
        pressureScore: Math.max(0, pressureScore - 8),
        stageIndex: game.wave,
      });
      lastSampledComboRef.current = game.maxCombo;
    }

    lastSampledLivesRef.current = game.lives;
  }, [game.lives, game.maxCombo, game.wave]);

  useEffect(() => {
    if (game.gameOver || game.victory) return;
    if (game.waveTransition <= 0) return;
    waveCheckpointRef.current = structuredClone(game);
  }, [game]);

  useEffect(() => {
    const nextBestWave = Math.max(bestWave, latestWaveRef.current);
    if (nextBestWave !== bestWave) {
      setBestWave(nextBestWave);
      localStorage.setItem(PIXEL_INVASION_BEST_WAVE_KEY, String(nextBestWave));
    }
  }, [bestWave, game.wave]);

  useEffect(() => {
    if (game.gameOver || game.victory || game.wave <= 1) return;

    const nextBestWave = Math.max(bestWave, latestWaveRef.current);
    void savePixelInvasionProgress({
      highestWave: nextBestWave,
      currentWave: game.wave,
      bestScore: Math.max(bestScore, game.score),
    }).catch(() => {
      // Fallback local uniquement.
    });
  }, [bestScore, bestWave, game.gameOver, game.kills, game.lineBursts, game.score, game.victory, game.wave]);

  useEffect(() => {
    if (!game.gameOver && !game.victory) return;

    const outcomeId = `${game.victory ? "victory" : "gameover"}-${game.wave}-${game.score}-${game.lineBursts}-${game.kills}`;
    if (resolvedOutcomeRef.current === outcomeId) return;
    resolvedOutcomeRef.current = outcomeId;

    const durationMs = Math.max(0, Date.now() - startTimeRef.current);
    const score = Math.max(0, Math.floor(game.score));
    const waveLevel = Math.max(1, game.wave);
    const highestWaveThisRun = Math.max(latestWaveRef.current, waveLevel);
    const collectedPowerups = trackedPowerupsRef.current;
    let sameScoreTwice = false;
    let reachedScoreMilestone = false;
    let reachedWave10Milestone = false;

    const next = updateStats((prev) => {
      sameScoreTwice = prev.lastScore !== null && prev.lastScore === score;
      reachedScoreMilestone = score > 0 && !prev.scoredModes.PIXEL_INVASION;
      reachedWave10Milestone = waveLevel >= 10 && !prev.level10Modes.PIXEL_INVASION;

      return {
        ...prev,
        scoredModes: {
          ...prev.scoredModes,
          PIXEL_INVASION: score > 0 ? true : prev.scoredModes.PIXEL_INVASION,
        },
        level10Modes: {
          ...prev.level10Modes,
          PIXEL_INVASION: waveLevel >= 10 ? true : prev.level10Modes.PIXEL_INVASION,
        },
        playtimeMs: prev.playtimeMs + durationMs,
        lastScore: score,
        counters: {
          ...prev.counters,
          pi_best_score: Math.max(prev.counters.pi_best_score ?? 0, score),
          pi_total_kills: (prev.counters.pi_total_kills ?? 0) + game.kills,
          pi_total_line_bursts: (prev.counters.pi_total_line_bursts ?? 0) + game.lineBursts,
          pi_runs_won: (prev.counters.pi_runs_won ?? 0) + (game.victory ? 1 : 0),
        },
      };
    });

    const mistakes = [
      ...(game.lives < 3 ? (["damage_taken"] as const) : []),
      ...(game.gameOver ? (["top_out"] as const) : []),
      ...(durationMs >= 8 * 60 * 1000 && waveLevel < 10 ? (["slow"] as const) : []),
    ];

    recordPlayerBehavior({
      mode: PIXEL_INVASION_MODE,
      won: game.victory,
      durationMs,
      mistakes,
      contextualMistakes: mistakes.map((mistake) => ({
        key: mistake,
        phase:
          waveLevel < 10 ? "early" : waveLevel < 25 ? "mid" : "late",
        pressure:
          mistake === "top_out" || game.lives === 1
            ? "high"
            : game.lives === 2
              ? "medium"
              : "low",
        trigger:
          mistake === "slow"
            ? "timeout"
            : mistake === "damage_taken"
              ? "attrition"
              : mistake === "top_out"
                ? game.lives === 1
                  ? "collapse"
                  : "attrition"
                : "unknown",
      })),
      runContext: {
        comboPeak: game.maxCombo,
        livesRemaining: game.lives,
        pressureScore: Math.round(
          Math.min(100, (3 - game.lives) * 28 + Math.min(40, waveLevel))
        ),
        stageIndex: waveLevel,
      },
      timelineSamples: timelineSamplesRef.current,
    });

    if (game.lineBursts >= 1 && game.lives === 3) {
      recordTetrobotEvent({ type: "rookie_tip_followed" });
    }
    if (reachedScoreMilestone || reachedWave10Milestone || game.victory) {
      recordTetrobotEvent({ type: "pulse_advice_success" });
    }

    checkAchievements({
      mode: PIXEL_INVASION_MODE,
      score,
      level: waveLevel,
      lines: game.lineBursts,
      custom: {
        pi_line_burst_1: game.lineBursts >= 1,
        pi_line_burst_4: game.lineBursts >= 4,
        pi_combo_8: game.maxCombo >= 8,
        pi_rookie_boss_down: highestWaveThisRun > 10 || game.victory,
        pi_pulse_boss_down: highestWaveThisRun > 20 || game.victory,
        pi_apex_boss_down: highestWaveThisRun > 30 || game.victory,
        pi_wave_50: highestWaveThisRun >= 50,
        pi_charge_loaded: collectedPowerups.has("charge"),
        pi_all_powerups: ["multi_shot", "laser", "piercing", "charge", "slow_field"].every((type) =>
          collectedPowerups.has(type)
        ),
        pi_victory: game.victory,
        pi_perfect_sector: game.victory && game.lives === 3,
        level_10_three_modes: countTrue(next.level10Modes) >= 3,
        scored_all_modes: countTrue(next.scoredModes) >= TOTAL_SCORED_MODES,
        modes_visited_all: countTrue(next.modesVisited) >= GAME_MODES.length,
        same_score_twice: sameScoreTwice,
      },
    });

    const nextBestScore = Math.max(bestScore, score);
    const nextBestWave = Math.max(bestWave, highestWaveThisRun);
    localStorage.removeItem(PIXEL_INVASION_PAUSED_RUN_KEY);
    setResumeSnapshot(null);
    if (nextBestScore !== bestScore) {
      localStorage.setItem(PIXEL_INVASION_BEST_SCORE_KEY, String(nextBestScore));
      setBestScore(nextBestScore);
    }
    if (nextBestWave !== bestWave) {
      localStorage.setItem(PIXEL_INVASION_BEST_WAVE_KEY, String(nextBestWave));
      setBestWave(nextBestWave);
    }

    async function persistOutcome() {
      await savePixelInvasionProgress({
        highestWave: nextBestWave,
        currentWave: waveLevel,
        bestScore: nextBestScore,
        totalKills: next.counters.pi_total_kills ?? 0,
        totalLineBursts: next.counters.pi_total_line_bursts ?? 0,
        victories: next.counters.pi_runs_won ?? 0,
        pausedRun: null,
      }).catch(() => {
        // Le stockage local reste disponible.
      });

      if (score <= 0 || pixelModeActive) return;

      try {
        const runToken = await getScoreRunToken(PIXEL_INVASION_MODE);
        await addScore(score, waveLevel, game.lineBursts, PIXEL_INVASION_MODE, runToken);
      } catch {
        // Le meilleur score local reste garanti si le backend refuse encore le mode.
      }
    }

    void persistOutcome();
  }, [
    bestScore,
    bestWave,
    checkAchievements,
    game.gameOver,
    game.kills,
    game.lineBursts,
    game.lives,
    game.maxCombo,
    game.score,
    game.victory,
    game.wave,
    pixelModeActive,
    recordPlayerBehavior,
    recordTetrobotEvent,
    updateStats,
  ]);

  const handleRestart = () => {
    resolvedOutcomeRef.current = null;
    startTimeRef.current = Date.now();
    latestWaveRef.current = 1;
    timelineSamplesRef.current = [];
    lastSampledLivesRef.current = 3;
    lastSampledWaveRef.current = 1;
    lastSampledComboRef.current = 0;
    trackedPowerupsRef.current = new Set(["multi_shot"]);
    waveCheckpointRef.current = null;
    lastWeaponPowerupRef.current = "multi_shot";
    lastSlowFieldTimerRef.current = 0;
    setResumeSnapshot(null);
    localStorage.removeItem(PIXEL_INVASION_PAUSED_RUN_KEY);
    void savePixelInvasionProgress({ pausedRun: null }).catch(() => {
      // Le reset local couvre le cas de fallback.
    });
    resetGame();
  };

  const clearPausedRun = () => {
    setResumeSnapshot(null);
    localStorage.removeItem(PIXEL_INVASION_PAUSED_RUN_KEY);
    void savePixelInvasionProgress({ pausedRun: null }).catch(() => {
      // Le reset local couvre le cas de fallback.
    });
  };

  const handleResumeSavedRun = () => {
    if (!resumeSnapshot) return;
    resolvedOutcomeRef.current = null;
    startTimeRef.current = Date.now();
    latestWaveRef.current = Math.max(resumeSnapshot.highestWaveReached, resumeSnapshot.game.wave);
    trackedPowerupsRef.current = new Set(resumeSnapshot.trackedPowerups);
    lastWeaponPowerupRef.current = resumeSnapshot.game.weaponPowerup;
    lastSlowFieldTimerRef.current = resumeSnapshot.game.slowFieldTimer;
    waveCheckpointRef.current = structuredClone(resumeSnapshot.game);
    loadGame(resumeSnapshot.game);
    clearPausedRun();
    resumeGame();
  };

  const handlePause = () => {
    if (game.gameOver || game.victory || resumeSnapshot || quittingRun) return;
    pauseGame();
  };

  async function persistPausedCheckpoint(snapshot: GameState) {
    const highestWave = Math.max(latestWaveRef.current, snapshot.wave);
    const pausedRun: PausedRunSnapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      highestWaveReached: highestWave,
      trackedPowerups: Array.from(trackedPowerupsRef.current),
      game: structuredClone(snapshot),
    };
    localStorage.setItem(PIXEL_INVASION_PAUSED_RUN_KEY, JSON.stringify(pausedRun));

    const nextBestScore = Math.max(bestScore, snapshot.score);
    const nextBestWave = Math.max(bestWave, highestWave);
    localStorage.setItem(PIXEL_INVASION_BEST_SCORE_KEY, String(nextBestScore));
    localStorage.setItem(PIXEL_INVASION_BEST_WAVE_KEY, String(nextBestWave));
    setBestScore(nextBestScore);
    setBestWave(nextBestWave);

    await savePixelInvasionProgress({
      highestWave: nextBestWave,
      currentWave: snapshot.wave,
      bestScore: nextBestScore,
      pausedRun,
    }).catch(() => {
      // La sauvegarde locale de run reste prioritaire si l'API échoue.
    });
  }

  const handleQuitPausedRun = async () => {
    if (quittingRun) return;
    const checkpoint = waveCheckpointRef.current ?? structuredClone(game);
    setQuittingRun(true);

    try {
      await persistPausedCheckpoint(checkpoint);
      navigate(PATHS.tetroVerse);
    } finally {
      setQuittingRun(false);
    }
  };

  const customOverlay = resumeSnapshot ? (
    <div className="pixel-invasion-overlay pixel-invasion-overlay--pause">
      <h2>Run suspendue</h2>
      <p>Une partie en cours a ete detectee. Tu peux la reprendre ou repartir sur une nouvelle run.</p>
      <div className="pixel-invasion-overlay-stats">
        <span>Vague {resumeSnapshot.game.wave}</span>
        <span>Score {resumeSnapshot.game.score}</span>
        <span>Vies {resumeSnapshot.game.lives}</span>
      </div>
      <div className="pixel-invasion-overlay-actions">
        <button type="button" className="retro-btn" onClick={handleResumeSavedRun}>
          Reprendre
        </button>
        <button type="button" className="retro-btn retro-btn--ghost" onClick={handleRestart}>
          Nouvelle run
        </button>
      </div>
    </div>
  ) : paused && !game.gameOver && !game.victory ? (
    <div className="pixel-invasion-overlay pixel-invasion-overlay--pause">
      <h2>Pause tactique</h2>
      <p>Le combat est fige. Tu peux reprendre immediatement ou quitter en sauvegardant le checkpoint valide.</p>
      <div className="pixel-invasion-overlay-stats">
        <span>Checkpoint vague {waveCheckpointRef.current?.wave ?? game.wave}</span>
        <span>Score {waveCheckpointRef.current?.score ?? game.score}</span>
        <span>Vies {waveCheckpointRef.current?.lives ?? game.lives}</span>
      </div>
      <div className="pixel-invasion-overlay-actions">
        <button type="button" className="retro-btn" onClick={resumeGame}>
          Reprendre
        </button>
        <button
          type="button"
          className="retro-btn retro-btn--ghost"
          onClick={() => {
            void handleQuitPausedRun();
          }}
          disabled={quittingRun}
        >
          {quittingRun ? "Sauvegarde..." : "Quitter"}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={`pixel-invasion-page pixel-invasion-page--${campaignTone} font-['Press_Start_2P']`}>
      <div className="pixel-invasion-shell">
        <header className="pixel-invasion-header">
          <div>
            <p className="pixel-invasion-kicker">Nouveau mode</p>
            <h1>Pixel Invasion</h1>
            <p className="pixel-invasion-subtitle">
              Un shooter arcade dans le Tetroverse: Pixel defend la ligne, les Tetrobots tombent,
              et chaque destruction nourrit une grille explosive.
            </p>
          </div>

          <div className="pixel-invasion-actions">
            <button type="button" className="retro-btn" onClick={toggleMute}>
              {muted ? "Son OFF" : "Son ON"}
            </button>
            {!game.gameOver && !game.victory && !resumeSnapshot && (
              <button type="button" className="retro-btn" onClick={handlePause}>
                Pause
              </button>
            )}
            <button type="button" className="retro-btn" onClick={handleRestart}>
              Relancer
            </button>
            <button type="button" className="retro-btn" onClick={() => navigate(PATHS.tetroVerse)}>
              Retour hub
            </button>
          </div>
        </header>

        <div className="pixel-invasion-layout">
          <PixelInvasionSidebar
            side="left"
            game={game}
            shieldRatio={shieldRatio}
            bestScore={bestScore}
            bestWave={bestWave}
            pixelAnomaly={pixelAnomaly}
          />
          <PixelInvasionBoard
            game={game}
            stars={stars}
            onRestart={handleRestart}
            customOverlay={customOverlay}
          />
          <PixelInvasionSidebar
            side="right"
            game={game}
            shieldRatio={shieldRatio}
            bestScore={bestScore}
            bestWave={bestWave}
            pixelAnomaly={pixelAnomaly}
          />
        </div>
      </div>
      <AchievementToast achievement={recentUnlocks[0] ?? null} onClose={clearRecent} />
    </div>
  );
}
