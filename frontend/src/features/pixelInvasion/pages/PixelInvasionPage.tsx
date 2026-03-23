import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AchievementToast from "../../achievements/components/AchievementToast";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { addScore, getMyScores, getScoreRunToken } from "../../game/services/scoreService";
import { GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import { useAutoClearRecentAchievements } from "../../roguelike/hooks/useAutoClearRecentAchievements";
import "../../../styles/pixel-invasion.css";
import { PixelInvasionBoard } from "../components/PixelInvasionBoard";
import { PixelInvasionSidebar } from "../components/PixelInvasionSidebar";
import { usePixelInvasionAudio } from "../hooks/usePixelInvasionAudio";
import { usePixelInvasionGame } from "../hooks/usePixelInvasionGame";
import { createStars } from "../model";
import {
  fetchPixelInvasionProgress,
  savePixelInvasionProgress,
} from "../services/pixelInvasionService";

const PIXEL_INVASION_MODE = "PIXEL_INVASION";
const PIXEL_INVASION_BEST_SCORE_KEY = "pixel-invasion-best-score";
const PIXEL_INVASION_BEST_WAVE_KEY = "pixel-invasion-best-wave";

function countTrue(values: Record<string, boolean>) {
  return Object.values(values).filter(Boolean).length;
}

export default function PixelInvasionPage() {
  const navigate = useNavigate();
  const { game, resetGame, shieldRatio } = usePixelInvasionGame();
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
  const lastWeaponPowerupRef = useRef<string | null>(null);
  const lastSlowFieldTimerRef = useRef(0);
  const latestWaveRef = useRef(1);
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

  useAutoClearRecentAchievements(recentUnlocks, clearRecent);

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
        localStorage.setItem(PIXEL_INVASION_BEST_SCORE_KEY, String(mergedBest));
        localStorage.setItem(PIXEL_INVASION_BEST_WAVE_KEY, String(mergedBestWave));
        if (!cancelled) {
          setBestScore(mergedBest);
          setBestWave(mergedBestWave);
        }
      } catch {
        // Fallback local si le backend n'a pas encore le mode.
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, []);

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
      }).catch(() => {
        // Le stockage local reste disponible.
      });

      if (score <= 0) return;

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
    recordPlayerBehavior,
    recordTetrobotEvent,
    updateStats,
  ]);

  const handleRestart = () => {
    resolvedOutcomeRef.current = null;
    startTimeRef.current = Date.now();
    latestWaveRef.current = 1;
    trackedPowerupsRef.current = new Set(["multi_shot"]);
    lastWeaponPowerupRef.current = "multi_shot";
    lastSlowFieldTimerRef.current = 0;
    resetGame();
  };

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
            <button type="button" className="retro-btn" onClick={handleRestart}>
              Relancer
            </button>
            <button type="button" className="retro-btn" onClick={() => navigate("/tetro-verse")}>
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
          />
          <PixelInvasionBoard game={game} stars={stars} onRestart={handleRestart} />
          <PixelInvasionSidebar
            side="right"
            game={game}
            shieldRatio={shieldRatio}
            bestScore={bestScore}
            bestWave={bestWave}
          />
        </div>
      </div>
      <AchievementToast achievement={recentUnlocks[0] ?? null} onClose={clearRecent} />
    </div>
  );
}
