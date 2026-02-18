import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useVersusSocket } from "../hooks/useVersusSocket";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import OpponentBoard from "../../game/components/board/OpponentBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { saveVersusMatch } from "../../game/services/scoreService";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES, TOTAL_SCORED_MODES } from "../../game/types/GameMode";
import {
  TETROBOTS_PERSONALITIES,
  getTetrobotsPersonality,
  type BotStrategy,
  type TetrobotsPersonality,
} from "../../game/ai/tetrobots";
import {
  getBotBubbleAccent,
  getBotMessage,
  getMemoryDialogue,
  getMoodFromEvent,
  resetBotDialogueState,
  getScoreTrollDialogue,
  type BotMood,
  type BotEvent,
  type PlayerStyle,
} from "../../game/ai/tetrobotsChat";
import { TetrobotsAvatar } from "../components/TetrobotsAvatar";
import { BotSpeechBubble } from "../components/BotSpeechBubble";
import { createRng } from "../../../shared/utils/rng";
import {
  getTetrobotsProfile,
  updateTetrobotsProfile,
  type PlayerProfile,
} from "../../game/services/scoreService";
import {
  TETROBOTS_ADAPTIVE_THRESHOLDS,
  TETROBOTS_MEMORY_TIMING,
  countBoardHoles,
  getLeftBias,
} from "../../game/ai/tetrobotsMemory";
import "../../../styles/tetrobots-avatar.css";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

const RED_ZONE_HEIGHT = 16;
const VERSUS_GARBAGE_MAP = [0, 0, 1, 2, 4];
const MEMORY_TIMING = TETROBOTS_MEMORY_TIMING.VERSUS;
const ADAPTIVE = TETROBOTS_ADAPTIVE_THRESHOLDS.VERSUS;

type EndResult = { score: number; lines: number };

function getStackHeight(board: number[][]): number {
  const rows = board.length;
  let topFilled = rows;
  for (let y = 0; y < rows; y += 1) {
    if (board[y].some((cell) => cell !== 0)) {
      topFilled = y;
      break;
    }
  }
  return rows - topFilled;
}

function useMarkVersusVisited() {
  const { checkAchievements, updateStats } = useAchievements();
  const visitedRef = useRef(false);

  const countTrue = (values: Record<string, boolean>) => Object.values(values).filter(Boolean).length;

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, VERSUS: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES },
    });
  }, [checkAchievements, updateStats]);
}

function VersusPvp() {
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [manualMatchId, setManualMatchId] = useState("");
  const [chosenMatchId, setChosenMatchId] = useState<string | undefined>(undefined);
  const startTimeRef = useRef<number | null>(null);
  const runDurationRef = useRef(0);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const linesSentRef = useRef(0);
  const maxStackHeightRef = useRef(0);
  const levelRef = useRef(1);
  const finalizedRef = useRef(false);

  useMarkVersusVisited();

  const resetRunTracking = () => {
    startTimeRef.current = null;
    runDurationRef.current = 0;
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    linesSentRef.current = 0;
    maxStackHeightRef.current = 0;
    levelRef.current = 1;
    finalizedRef.current = false;
  };

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  const joinId = useMemo(
    () => (chosenMatchId ?? manualMatchId) || undefined,
    [manualMatchId, chosenMatchId]
  );

  const {
    connected,
    currentMatchId,
    players,
    opponentLeft,
    matchOver,
    error,
    bagSequence,
    garbage,
    actions,
    opponentBoard,
    opponentFinished,
    slot,
    results,
    playersInfo,
  } = useVersusSocket({ matchId: joinId, userId: user?.id, pseudo: user?.pseudo });

  const startReady = players >= 2 && bagSequence.length > 0;
  const [localFinished, setLocalFinished] = useState(false);
  const [hasSavedResult, setHasSavedResult] = useState(false);

  useEffect(() => {
    setHasSavedResult(false);
  }, [currentMatchId]);

  useEffect(() => {
    if (currentMatchId) {
      resetRunTracking();
    }
  }, [currentMatchId]);

  useEffect(() => {
    if (!matchOver || !results || slot === null || !user || hasSavedResult) return;
    if (slot !== 1) return;
    if (results.length < 2) return;

    const payload = {
      matchId: currentMatchId ?? undefined,
      players: results.map((r) => {
        const meta = playersInfo.find((p) => p.slot === r.slot);
        const isSelf = r.slot === slot;
        return {
          slot: r.slot,
          userId: meta?.userId ?? (isSelf ? user.id : undefined),
          pseudo: meta?.pseudo ?? (isSelf ? user.pseudo : "Adversaire"),
          score: r.score,
          lines: r.lines,
        };
      }),
    };

    saveVersusMatch(payload).catch((err) =>
      console.error("Erreur enregistrement match versus :", err)
    );
    setHasSavedResult(true);
  }, [currentMatchId, hasSavedResult, matchOver, playersInfo, results, slot, user]);

  useEffect(() => {
    if (!matchOver || !results || slot === null) return;
    if (finalizedRef.current) return;
    const myResult = results.find((r) => r.slot === slot) ?? null;
    const oppResult = results.find((r) => r.slot !== slot) ?? null;
    if (!myResult || !oppResult) return;

    const win = myResult.score > oppResult.score;
    const perfectWin = win && maxStackHeightRef.current < RED_ZONE_HEIGHT;
    const durationMs = runDurationRef.current;
    const noHold = holdCountRef.current === 0;
    const noHardDrop = hardDropCountRef.current === 0;
    const level = levelRef.current;
    let sameScoreTwice = false;

    const next = updateStats((prev) => {
      sameScoreTwice = prev.lastScore !== null && prev.lastScore === myResult.score;
      return {
        ...prev,
        versusMatches: prev.versusMatches + 1,
        versusWins: prev.versusWins + (win ? 1 : 0),
        versusWinStreak: win ? prev.versusWinStreak + 1 : 0,
        versusLinesSent: prev.versusLinesSent + linesSentRef.current,
        scoredModes: {
          ...prev.scoredModes,
          VERSUS: myResult.score > 0 ? true : prev.scoredModes.VERSUS,
        },
        level10Modes: {
          ...prev.level10Modes,
          VERSUS: level >= 10 ? true : prev.level10Modes.VERSUS,
        },
        playtimeMs: prev.playtimeMs + durationMs,
        noHoldRuns: prev.noHoldRuns + (noHold ? 1 : 0),
        hardDropCount: prev.hardDropCount + hardDropCountRef.current,
        lastScore: myResult.score,
      };
    });

    checkAchievements({
      mode: "VERSUS",
      score: myResult.score,
      lines: myResult.lines,
      level,
      tetrisCleared: tetrisCountRef.current > 0,
      custom: {
        versus_match_1: next.versusMatches >= 1,
        versus_match_10: next.versusMatches >= 10,
        versus_match_50: next.versusMatches >= 50,
        versus_win_1: next.versusWins >= 1,
        versus_win_streak_5: next.versusWinStreak >= 5,
        versus_perfect_win: perfectWin,
        versus_lines_sent_20: next.versusLinesSent >= 20,
        combo_5: maxComboRef.current >= 5,
        no_hold_runs_10: next.noHoldRuns >= 10,
        harddrop_50: next.hardDropCount >= 50,
        no_harddrop_10_min: durationMs >= 10 * 60 * 1000 && noHardDrop,
        playtime_60m: next.playtimeMs >= 60 * 60 * 1000,
        playtime_300m: next.playtimeMs >= 300 * 60 * 1000,
        level_10_three_modes: countTrue(next.level10Modes) >= 3,
        scored_all_modes: countTrue(next.scoredModes) >= TOTAL_SCORED_MODES,
        modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES,
        same_score_twice: sameScoreTwice,
      },
    });

    finalizedRef.current = true;
  }, [matchOver, results, slot, updateStats, checkAchievements]);

  if (startReady) {
    const myResult = results?.find((r) => r.slot === slot) ?? null;
    const oppResult = results?.find((r) => r.slot !== slot) ?? null;

    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative">
        <h1 className="text-3xl text-yellow-400 mb-4 drop-shadow-[0_0_15px_#ff00ff]">Partie VS</h1>
        <p className="text-sm text-cyan-200 mb-4">
          {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
        </p>
        <div className="flex gap-6 items-start">
          <TetrisBoard
            mode="VERSUS"
            scoreMode={null}
            bagSequence={bagSequence}
            incomingGarbage={garbage}
            onGarbageConsumed={actions.consumeGarbage}
            onConsumeLines={(lines) => {
              linesSentRef.current += lines;
              actions.sendLinesCleared(lines);
            }}
            onLinesCleared={(linesCleared) => {
              if (linesCleared > 0) {
                comboStreakRef.current += linesCleared;
                if (comboStreakRef.current > maxComboRef.current) {
                  maxComboRef.current = comboStreakRef.current;
                }
              } else {
                comboStreakRef.current = 0;
              }
              if (linesCleared === 4) {
                tetrisCountRef.current += 1;
              }
            }}
            onBoardUpdate={(board) => {
              const rows = board.length;
              let topFilled = rows;
              for (let y = 0; y < rows; y += 1) {
                if (board[y].some((cell) => cell !== 0)) {
                  topFilled = y;
                  break;
                }
              }
              const height = rows - topFilled;
              if (height > maxStackHeightRef.current) {
                maxStackHeightRef.current = height;
              }
              actions.sendBoardState(board);
            }}
            onLocalGameOver={(score, lines) => {
              setLocalFinished(true);
              if (startTimeRef.current) {
                runDurationRef.current = Date.now() - startTimeRef.current;
              }
              actions.sendGameOver(score, lines);
            }}
            hideGameOverOverlay
            onGameStart={() => {
              resetRunTracking();
              startTimeRef.current = Date.now();
            }}
            onHold={() => {
              holdCountRef.current += 1;
            }}
            onHardDrop={() => {
              hardDropCountRef.current += 1;
            }}
            onLevelChange={(level) => {
              levelRef.current = level;
            }}
          />
          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-gray-300 mb-2">Grille adverse</p>
            <OpponentBoard board={opponentBoard} />
            {opponentLeft && <p className="text-yellow-300">Adversaire parti</p>}
            {opponentFinished && !matchOver && <p className="text-green-300">Adversaire a terminé</p>}
          </div>
        </div>
        {error && <p className="text-red-400 mt-2">{error}</p>}

        <FullScreenOverlay show={!matchOver && localFinished && !opponentFinished}>
          <div className="flex flex-col gap-3 items-center text-white text-lg font-bold">
            <p>En attente de l’adversaire...</p>
          </div>
        </FullScreenOverlay>

        <FullScreenOverlay show={matchOver && !!results}>
          <div
            style={{
              background: "rgba(0,0,0,0.85)",
              border: "2px solid #ff00ff",
              borderRadius: "12px",
              padding: "24px 28px",
              minWidth: "320px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
              color: "white",
              textAlign: "center",
              boxShadow: "0 0 20px #ff00ff",
            }}
          >
            <h2 className="text-xl text-yellow-300">Résultats</h2>
            <p>Toi : {myResult ? `${myResult.score} pts / ${myResult.lines} lignes` : "n/a"}</p>
            <p>Adversaire : {oppResult ? `${oppResult.score} pts / ${oppResult.lines} lignes` : "n/a"}</p>
            <div className="flex gap-4 mt-2">
              <button
                className="retro-btn"
                onClick={() => {
                  setLocalFinished(false);
                  setChosenMatchId(undefined);
                  setManualMatchId("");
                  actions.leaveMatch();
                }}
              >
                Retour lobby
              </button>
            </div>
          </div>
        </FullScreenOverlay>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-10">
      <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">Mode Versus</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-[90%]" style={{ maxWidth: "820px" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 0 18px #ff00ff",
          }}
        >
          <p className="text-sm text-cyan-200 text-left">
            {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
          </p>

          <div className="text-left flex flex-col gap-3 mt-3">
            <label className="text-xs text-yellow-300 uppercase tracking-wide">Créer / Rejoindre</label>
            <div className="flex items-center  w-full">
              <input
                value={manualMatchId}
                onChange={(e) => setManualMatchId(e.target.value)}
                placeholder="ID de partie (vide pour créer)"
                className="retro-input flex-1 min-w-[0px]"
              />
              <button
                className="retro-btn whitespace-nowrap flex-shrink-0 ml-20"
                onClick={() => {
                  if (!manualMatchId) {
                    setChosenMatchId(randomMatchId());
                  } else {
                    setChosenMatchId(manualMatchId);
                  }
                  actions.resetState();
                }}
              >
                Go
              </button>
            </div>
            <p className="text-xs text-gray-300">
              Laisse vide pour créer un nouvel ID, ou saisis l’ID de ton ami.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left text-sm bg-pink-900/20 p-3 rounded-md border border-pink-500/50 mt-4">
            <div>
              <p className="text-gray-300">Statut WS</p>
              <p className={connected ? "text-green-300" : "text-red-400"}>
                {connected ? "connecté" : "déconnecté"}
              </p>
            </div>
            <div>
              <p className="text-gray-300">Joueurs</p>
              <p className="text-white">{players}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-300">ID partie</p>
              <p className="text-white">{currentMatchId ?? "en attente"}</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 0 18px #ff00ff",
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-left text-yellow-300 text-xs uppercase tracking-wide">Comment jouer</p>
          <ul className="text-left text-sm text-gray-200 space-y-2">
            <li>Crée un ID (laisser vide) ou saisis celui envoyé par ton ami.</li>
            <li>Dès que 2 joueurs sont connectés, la partie démarre avec le même tirage.</li>
            <li>Les lignes envoyées ajoutent du garbage à l’adversaire.</li>
            <li>Quand vous êtes tous les deux Game Over, un écran de résultats s’affiche.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VersusTetrobots() {
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [roundSeed, setRoundSeed] = useState(() => `tetrobots-${Date.now()}`);
  const [roundKey, setRoundKey] = useState(0);
  const [started, setStarted] = useState(false);
  const [playerIncomingGarbage, setPlayerIncomingGarbage] = useState(0);
  const [botIncomingGarbage, setBotIncomingGarbage] = useState(0);
  const [botBoard, setBotBoard] = useState<number[][] | null>(null);
  const [playerResult, setPlayerResult] = useState<EndResult | null>(null);
  const [botResult, setBotResult] = useState<EndResult | null>(null);
  const [botPersonalityId, setBotPersonalityId] = useState<TetrobotsPersonality["id"]>("balanced");
  const [hasSavedResult, setHasSavedResult] = useState(false);
  const [botMessage, setBotMessage] = useState<string | null>(null);
  const [botMood, setBotMood] = useState<BotMood>("idle");

  const startTimeRef = useRef<number | null>(null);
  const runDurationRef = useRef(0);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const linesSentRef = useRef(0);
  const maxStackHeightRef = useRef(0);
  const levelRef = useRef(1);
  const finalizedRef = useRef(false);
  const playerBoardRef = useRef<number[][] | null>(null);
  const botBoardRef = useRef<number[][] | null>(null);
  const botBlunderRef = useRef(false);
  const botPersonalityWinsRef = useRef<Set<TetrobotsPersonality["id"]>>(new Set());
  const playerLiveScoreRef = useRef(0);
  const playerLiveLinesRef = useRef(0);
  const botLiveScoreRef = useRef(0);
  const botLiveLinesRef = useRef(0);
  const botLastMessageAtRef = useRef(0);
  const botMessageCooldownMs = 2200;
  const playerChainRef = useRef(0);
  const playerB2BRef = useRef(0);
  const playerHighStackAnnouncedRef = useRef(false);
  const closeCallAnnouncedRef = useRef(false);
  const longMatchAnnouncedRef = useRef(false);
  const matchStartAnnouncedRef = useRef(false);
  const comebackAnnouncedRef = useRef(false);
  const playerStackHeightRef = useRef(0);
  const botStackHeightRef = useRef(0);
  const playerStackSumRef = useRef(0);
  const playerStackSamplesRef = useRef(0);
  const playerAggressionScoreRef = useRef(0);
  const botStrategyRef = useRef<BotStrategy>("neutral");
  const botStrategyShiftCountRef = useRef(0);
  const aggressiveDetectAnnouncedRef = useRef(false);
  const defensiveDetectAnnouncedRef = useRef(false);
  const comboSpamAnnouncedRef = useRef(false);
  const highRiskAnnouncedRef = useRef(false);
  const exploitingPatternAnnouncedRef = useRef(false);
  const analysisCompleteAnnouncedRef = useRef(false);
  const lastAdaptiveEventAtRef = useRef(0);
  const botSawPressureRef = useRef(false);
  const botSawDefensiveRef = useRef(false);
  const botTriggeredPanicRef = useRef(false);
  const botExploitPatternCountRef = useRef(0);
  const botAnalysisCompleteRef = useRef(false);
  const botFailedAdaptationRef = useRef(false);
  const playerProfileRef = useRef<PlayerProfile | null>(null);
  const playerStyleRef = useRef<PlayerStyle>("balanced");
  const memoryDialogueTriggeredRef = useRef(false);
  const botStyleDetectedRef = useRef(false);
  const sameBotMatchesRef = useRef(0);
  const redZoneTimeMsRef = useRef(0);
  const lastBoardSampleAtRef = useRef<number | null>(null);
  const inRedZoneRef = useRef(false);
  const comboSampleCountRef = useRef(0);
  const comboValueSumRef = useRef(0);
  const lastTrollAtRef = useRef(0);
  const botMoodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMarkVersusVisited();

  const matchOver = started && (!!playerResult || !!botResult);
  const botPersonality = getTetrobotsPersonality(botPersonalityId);
  const botBubbleAccent = getBotBubbleAccent(botPersonality);

  const emitBotEvent = (event: BotEvent, bypassCooldown = false) => {
    const now = Date.now();
    if (!bypassCooldown && now - botLastMessageAtRef.current < botMessageCooldownMs) {
      return;
    }
    const message = getBotMessage(botPersonality, event);
    const mood = getMoodFromEvent(botPersonality, event.type);
    setBotMood(mood);
    if (botMoodTimeoutRef.current) {
      clearTimeout(botMoodTimeoutRef.current);
    }
    if (mood !== "thinking") {
      botMoodTimeoutRef.current = setTimeout(() => {
        setBotMood("idle");
      }, mood === "glitch" ? 700 : 1300);
    }
    if (!message) return;
    botLastMessageAtRef.current = now;
    setBotMessage(message);
  };

  const emitCustomBotLine = (
    message: string,
    mood: BotMood = "thinking",
    bypassCooldown = false
  ) => {
    const now = Date.now();
    if (!bypassCooldown && now - botLastMessageAtRef.current < botMessageCooldownMs) return;
    botLastMessageAtRef.current = now;
    setBotMood(mood);
    if (botMoodTimeoutRef.current) clearTimeout(botMoodTimeoutRef.current);
    if (mood !== "thinking") {
      botMoodTimeoutRef.current = setTimeout(() => setBotMood("idle"), 1300);
    }
    setBotMessage(message);
  };

  const canEmitAdaptiveEvent = (
    options: { minMatchMs?: number; minLines?: number; minIntervalMs?: number } = {}
  ) => {
    const {
      minMatchMs = MEMORY_TIMING.adaptiveMinMatchMs,
      minLines = MEMORY_TIMING.adaptiveMinLines,
      minIntervalMs = MEMORY_TIMING.adaptiveEventCooldownMs,
    } = options;
    if (!started || matchOver) return false;
    if (playerLiveLinesRef.current < minLines) return false;
    const now = Date.now();
    if (startTimeRef.current && now - startTimeRef.current < minMatchMs) return false;
    if (now - lastAdaptiveEventAtRef.current < minIntervalMs) return false;
    lastAdaptiveEventAtRef.current = now;
    return true;
  };

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  const mapGarbage = (lines: number) => Math.max(0, VERSUS_GARBAGE_MAP[lines] ?? 0);

  const playerRng = useMemo(() => createRng(roundSeed), [roundSeed]);
  const botRng = useMemo(() => createRng(roundSeed), [roundSeed]);

  const resetRunTracking = () => {
    startTimeRef.current = null;
    runDurationRef.current = 0;
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    linesSentRef.current = 0;
    maxStackHeightRef.current = 0;
    levelRef.current = 1;
    finalizedRef.current = false;
    playerBoardRef.current = null;
    botBoardRef.current = null;
    botBlunderRef.current = false;
    playerLiveScoreRef.current = 0;
    playerLiveLinesRef.current = 0;
    botLiveScoreRef.current = 0;
    botLiveLinesRef.current = 0;
    playerChainRef.current = 0;
    playerB2BRef.current = 0;
    playerHighStackAnnouncedRef.current = false;
    closeCallAnnouncedRef.current = false;
    longMatchAnnouncedRef.current = false;
    matchStartAnnouncedRef.current = false;
    comebackAnnouncedRef.current = false;
    playerStackHeightRef.current = 0;
    botStackHeightRef.current = 0;
    playerStackSumRef.current = 0;
    playerStackSamplesRef.current = 0;
    playerAggressionScoreRef.current = 0;
    botStrategyRef.current = "neutral";
    botStrategyShiftCountRef.current = 0;
    aggressiveDetectAnnouncedRef.current = false;
    defensiveDetectAnnouncedRef.current = false;
    comboSpamAnnouncedRef.current = false;
    highRiskAnnouncedRef.current = false;
    exploitingPatternAnnouncedRef.current = false;
    analysisCompleteAnnouncedRef.current = false;
    lastAdaptiveEventAtRef.current = 0;
    botSawPressureRef.current = false;
    botSawDefensiveRef.current = false;
    botTriggeredPanicRef.current = false;
    botExploitPatternCountRef.current = 0;
    botAnalysisCompleteRef.current = false;
    botFailedAdaptationRef.current = false;
    memoryDialogueTriggeredRef.current = false;
    botStyleDetectedRef.current = false;
    sameBotMatchesRef.current = 0;
    redZoneTimeMsRef.current = 0;
    lastBoardSampleAtRef.current = null;
    inRedZoneRef.current = false;
    comboSampleCountRef.current = 0;
    comboValueSumRef.current = 0;
    lastTrollAtRef.current = 0;
    setBotMessage(null);
    setBotMood("idle");
  };

  const maybeEmitComeback = () => {
    if (!started || matchOver) return;
    const playerScore = playerLiveScoreRef.current;
    const botScore = botLiveScoreRef.current;
    if (playerScore < botScore) {
      comebackAnnouncedRef.current = true;
      return;
    }
    if (comebackAnnouncedRef.current && playerScore > botScore) {
      emitBotEvent({ type: "comeback" });
      comebackAnnouncedRef.current = false;
    }
  };

  useEffect(() => {
    if (!started || matchOver) return;
    let cancelled = false;
    getTetrobotsProfile()
      .then(({ profile, style }) => {
        if (cancelled) return;
        playerProfileRef.current = profile;
        playerStyleRef.current = style;
        const sameBotMatches =
          botPersonalityId === "rookie"
            ? profile.matchesVsRookie
            : botPersonalityId === "balanced"
              ? profile.matchesVsBalanced
              : profile.matchesVsApex;
        sameBotMatchesRef.current = sameBotMatches;
        if (profile.totalMatches >= 1) {
          const line = getMemoryDialogue(botPersonality, style);
          emitCustomBotLine(line, "thinking", true);
          memoryDialogueTriggeredRef.current = true;
          botStyleDetectedRef.current = true;
        }
      })
      .catch(() => {
        // mode offline/fallback: pas bloquant
      });
    return () => {
      cancelled = true;
    };
  }, [botPersonality, botPersonalityId, matchOver, started]);

  useEffect(() => {
    if (!started) return;
    if (!playerResult && !botResult) return;
    if (playerResult && botResult) return;

    if (startTimeRef.current && runDurationRef.current === 0) {
      runDurationRef.current = Date.now() - startTimeRef.current;
    }

    if (playerResult && !botResult) {
      setBotResult({
        score: Math.max(botLiveScoreRef.current, playerResult.score + 1),
        lines: botLiveLinesRef.current,
      });
      return;
    }

    if (botResult && !playerResult) {
      setPlayerResult({
        score: Math.max(playerLiveScoreRef.current, botResult.score + 1),
        lines: playerLiveLinesRef.current,
      });
    }
  }, [started, playerResult, botResult]);

  useEffect(() => {
    if (!started || matchOver) return;
    const timeout = setTimeout(() => {
      if (longMatchAnnouncedRef.current) return;
      longMatchAnnouncedRef.current = true;
      emitBotEvent({ type: "long_match" });
    }, 90_000);
    return () => clearTimeout(timeout);
  }, [started, matchOver, botPersonalityId]);

  useEffect(() => {
    return () => {
      if (botMoodTimeoutRef.current) {
        clearTimeout(botMoodTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!matchOver || !playerResult || !botResult) return;
    const botWon = botResult.score > playerResult.score;
    emitBotEvent({ type: botWon ? "bot_win" : "bot_lose" }, true);
  }, [matchOver, playerResult, botResult, botPersonalityId]);

  useEffect(() => {
    if (!matchOver || !playerResult || !botResult || finalizedRef.current) return;

    const win = playerResult.score > botResult.score;
    const perfectWin = win && maxStackHeightRef.current < RED_ZONE_HEIGHT;
    const durationMs = runDurationRef.current;
    const noHold = holdCountRef.current === 0;
    const noHardDrop = hardDropCountRef.current === 0;
    const level = levelRef.current;
    const playerHoles = countBoardHoles(playerBoardRef.current);
    const botHoles = countBoardHoles(botBoardRef.current);
    const adaptiveTriggered = botStrategyShiftCountRef.current > 0;
    const comboAvg =
      comboSampleCountRef.current > 0
        ? comboValueSumRef.current / comboSampleCountRef.current
        : 0;
    const totalRunMs = Math.max(1, durationMs);
    const redZoneRate = Math.max(0, Math.min(1, redZoneTimeMsRef.current / totalRunMs));
    const predictedSameBotMatches = (() => {
      const p = playerProfileRef.current;
      if (!p) return 1;
      if (botPersonalityId === "rookie") return p.matchesVsRookie + 1;
      if (botPersonalityId === "balanced") return p.matchesVsBalanced + 1;
      return p.matchesVsApex + 1;
    })();
    const wonVsRookie = win && botPersonalityId === "rookie";
    const wonVsBalanced = win && botPersonalityId === "balanced";
    const wonVsApex = win && botPersonalityId === "apex";
    if (wonVsRookie) botPersonalityWinsRef.current.add("rookie");
    if (wonVsBalanced) botPersonalityWinsRef.current.add("balanced");
    if (wonVsApex) botPersonalityWinsRef.current.add("apex");
    let sameScoreTwice = false;

    const next = updateStats((prev) => {
      sameScoreTwice = prev.lastScore !== null && prev.lastScore === playerResult.score;
      return {
        ...prev,
        versusMatches: prev.versusMatches + 1,
        versusWins: prev.versusWins + (win ? 1 : 0),
        versusWinStreak: win ? prev.versusWinStreak + 1 : 0,
        versusLinesSent: prev.versusLinesSent + linesSentRef.current,
        botMatches: prev.botMatches + 1,
        botWins: prev.botWins + (win ? 1 : 0),
        botWinStreak: win ? prev.botWinStreak + 1 : 0,
        botApexWins: prev.botApexWins + (wonVsApex ? 1 : 0),
        scoredModes: {
          ...prev.scoredModes,
          VERSUS: playerResult.score > 0 ? true : prev.scoredModes.VERSUS,
        },
        level10Modes: {
          ...prev.level10Modes,
          VERSUS: level >= 10 ? true : prev.level10Modes.VERSUS,
        },
        playtimeMs: prev.playtimeMs + durationMs,
        noHoldRuns: prev.noHoldRuns + (noHold ? 1 : 0),
        hardDropCount: prev.hardDropCount + hardDropCountRef.current,
        lastScore: playerResult.score,
      };
    });

    checkAchievements({
      mode: "VERSUS",
      score: playerResult.score,
      lines: playerResult.lines,
      level,
      tetrisCleared: tetrisCountRef.current > 0,
      custom: {
        versus_match_1: next.versusMatches >= 1,
        versus_match_10: next.versusMatches >= 10,
        versus_match_50: next.versusMatches >= 50,
        versus_win_1: next.versusWins >= 1,
        versus_win_streak_5: next.versusWinStreak >= 5,
        versus_perfect_win: perfectWin,
        versus_lines_sent_20: next.versusLinesSent >= 20,
        combo_5: maxComboRef.current >= 5,
        no_hold_runs_10: next.noHoldRuns >= 10,
        harddrop_50: next.hardDropCount >= 50,
        no_harddrop_10_min: durationMs >= 10 * 60 * 1000 && noHardDrop,
        playtime_60m: next.playtimeMs >= 60 * 60 * 1000,
        playtime_300m: next.playtimeMs >= 300 * 60 * 1000,
        level_10_three_modes: countTrue(next.level10Modes) >= 3,
        scored_all_modes: countTrue(next.scoredModes) >= TOTAL_SCORED_MODES,
        modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES,
        same_score_twice: sameScoreTwice,
        bot_match_1: next.botMatches >= 1,
        bot_win_1: next.botWins >= 1,
        bot_rookie_win: wonVsRookie,
        bot_balanced_win: wonVsBalanced,
        bot_apex_win: wonVsApex,
        bot_perfect_win: perfectWin,
        bot_win_under_60s: win && durationMs > 0 && durationMs < 60_000,
        bot_won_after_blunder: win && botBlunderRef.current,
        bot_fewer_holes: win && playerHoles < botHoles,
        bot_win_streak_5: next.botWinStreak >= 5,
        bot_all_personalities_session:
          botPersonalityWinsRef.current.size >= TETROBOTS_PERSONALITIES.length,
        bot_apex_win_10: next.botApexWins >= 10,
        bot_outscore_lines_apex: wonVsApex && playerResult.lines > botResult.lines,
        bot_adaptive_match_1: true,
        bot_adaptive_win: win,
        bot_win_after_strategy_shift: win && botStrategyShiftCountRef.current > 0,
        bot_win_vs_pressure_mode: win && botSawPressureRef.current,
        bot_win_vs_defensive_mode: win && botSawDefensiveRef.current,
        bot_trigger_panic: botTriggeredPanicRef.current,
        bot_exploit_pattern_3: botExploitPatternCountRef.current >= 3,
        bot_forced_multiple_strategy_shifts: botStrategyShiftCountRef.current >= 3,
        bot_adaptive_apex_win: wonVsApex,
        bot_adaptive_lines_50:
          linesSentRef.current >= 50 && botStrategyShiftCountRef.current > 0,
        bot_no_strategy_change_win: win && botStrategyShiftCountRef.current === 0,
        bot_win_after_5_adaptations: win && botStrategyShiftCountRef.current >= 5,
        bot_adapt_failed_analysis: win && botAnalysisCompleteRef.current && botFailedAdaptationRef.current,
        bot_adapt_all_personalities_session:
          botPersonalityWinsRef.current.size >= TETROBOTS_PERSONALITIES.length,
        bot_memory_dialogue: memoryDialogueTriggeredRef.current,
        bot_detected_style: botStyleDetectedRef.current,
        win_after_bot_adapt: win && adaptiveTriggered,
        bot_10_matches_same: predictedSameBotMatches >= 10,
      },
    });

    updateTetrobotsProfile({
      avgHeight:
        playerStackSamplesRef.current > 0
          ? playerStackSumRef.current / playerStackSamplesRef.current
          : playerStackHeightRef.current,
      holes: playerHoles,
      comboAvg,
      tetrisRate:
        playerLiveLinesRef.current > 0
          ? tetrisCountRef.current / playerLiveLinesRef.current
          : 0,
      linesSent: linesSentRef.current,
      linesSurvived: playerLiveLinesRef.current,
      redZoneTime: redZoneRate,
      leftBias: getLeftBias(playerBoardRef.current),
      usedHold: holdCountRef.current > 0,
      botPersonality: botPersonalityId,
    })
      .then(({ profile, style }) => {
        playerProfileRef.current = profile;
        playerStyleRef.current = style;
        if (botPersonalityId === "rookie") sameBotMatchesRef.current = profile.matchesVsRookie;
        else if (botPersonalityId === "balanced")
          sameBotMatchesRef.current = profile.matchesVsBalanced;
        else sameBotMatchesRef.current = profile.matchesVsApex;
      })
      .catch(() => {
        // non-bloquant pour la fin de match
      });

    finalizedRef.current = true;
  }, [botPersonalityId, botResult, checkAchievements, matchOver, playerResult, updateStats]);

  useEffect(() => {
    if (!matchOver || !playerResult || !botResult || !user || hasSavedResult) return;
    const payload = {
      matchId: roundSeed,
      players: [
        {
          slot: 1,
          userId: user.id,
          pseudo: user.pseudo,
          score: playerResult.score,
          lines: playerResult.lines,
        },
        {
          slot: 2,
          pseudo: botPersonality.name,
          score: botResult.score,
          lines: botResult.lines,
        },
      ],
    };

    saveVersusMatch(payload).catch((err) =>
      console.error("Erreur enregistrement match versus (Tetrobots) :", err)
    );
    setHasSavedResult(true);
  }, [botPersonality.name, botResult, hasSavedResult, matchOver, playerResult, roundSeed, user]);

  const startMatch = () => {
    resetBotDialogueState(botPersonalityId);
    setRoundSeed(`tetrobots-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`);
    setRoundKey((prev) => prev + 1);
    setStarted(true);
    setPlayerIncomingGarbage(0);
    setBotIncomingGarbage(0);
    setBotBoard(null);
    setPlayerResult(null);
    setBotResult(null);
    setHasSavedResult(false);
    resetRunTracking();
  };

  const backToLobby = () => {
    setStarted(false);
    setPlayerIncomingGarbage(0);
    setBotIncomingGarbage(0);
    setBotBoard(null);
    setPlayerResult(null);
    setBotResult(null);
    setHasSavedResult(false);
    resetRunTracking();
  };

  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-10">
        <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">Mode Versus - Solo</h1>

        <div
          className="w-[90%] max-w-[820px]"
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 0 18px #ff00ff",
          }}
        >
          <p className="text-sm text-cyan-200 text-left mb-4">
            {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
          </p>

          <div className="text-left flex flex-col gap-3">
            <label className="text-xs text-yellow-300 uppercase tracking-wide">Adversaire bot</label>
            <select
              value={botPersonalityId}
              onChange={(e) => setBotPersonalityId(e.target.value as TetrobotsPersonality["id"])}
              className="retro-select w-full"
            >
              {TETROBOTS_PERSONALITIES.map((personality) => (
                <option key={personality.id} value={personality.id}>
                  {personality.name} - {personality.difficultyLabel}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-300">{botPersonality.description}</p>
            <button className="retro-btn self-start mt-2" onClick={startMatch}>
              Lancer le duel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myScore = playerResult?.score ?? 0;
  const myLines = playerResult?.lines ?? 0;
  const botScore = botResult?.score ?? 0;
  const botLines = botResult?.lines ?? 0;
  const botWaiting = !!playerResult && !botResult && !matchOver;

  return (
    <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative" key={roundKey}>
      <h1 className="text-3xl text-yellow-400 mb-2 drop-shadow-[0_0_15px_#ff00ff]">Partie VS Tetrobots</h1>
      <p className="text-xs text-cyan-200 mb-4">{botPersonality.name} - {botPersonality.difficultyLabel}</p>

      <div className="flex gap-6 items-start">
        <TetrisBoard
          mode="VERSUS"
          scoreMode={null}
          rng={playerRng}
          incomingGarbage={playerIncomingGarbage}
          onGarbageConsumed={() => setPlayerIncomingGarbage(0)}
          onConsumeLines={(lines) => {
            const garbage = mapGarbage(lines);
            linesSentRef.current += lines;
            if (garbage > 0) {
              setBotIncomingGarbage((prev) => prev + garbage);
            }
          }}
          onLinesCleared={(linesCleared) => {
            if (linesCleared > 0) {
              playerAggressionScoreRef.current = Math.max(
                0,
                playerAggressionScoreRef.current * 0.82
              );
              playerLiveLinesRef.current += linesCleared;
              playerChainRef.current += 1;
              comboStreakRef.current += linesCleared;
              playerAggressionScoreRef.current += linesCleared * 2;
              if (comboStreakRef.current > maxComboRef.current) {
                maxComboRef.current = comboStreakRef.current;
              }
              if (playerChainRef.current >= 2) {
                playerAggressionScoreRef.current += playerChainRef.current;
                comboSampleCountRef.current += 1;
                comboValueSumRef.current += playerChainRef.current;
                emitBotEvent({ type: "player_combo", value: playerChainRef.current });
                if (
                  playerChainRef.current >= (ADAPTIVE.comboSpam.minChain ?? 0) &&
                  !comboSpamAnnouncedRef.current
                ) {
                  if (
                    comboStreakRef.current >= ADAPTIVE.comboSpam.minComboStreak &&
                    playerAggressionScoreRef.current >= ADAPTIVE.comboSpam.minAggression &&
                    canEmitAdaptiveEvent({
                      minMatchMs: ADAPTIVE.comboSpam.minMatchMs,
                      minLines: ADAPTIVE.comboSpam.minLines,
                    })
                  ) {
                    comboSpamAnnouncedRef.current = true;
                    emitBotEvent({ type: "bot_detect_combo_spam" });
                  }
                }
              }
            } else {
              playerAggressionScoreRef.current *= 0.75;
              playerChainRef.current = 0;
              comboStreakRef.current = 0;
            }
            if (linesCleared === 4) {
              playerB2BRef.current += 1;
              tetrisCountRef.current += 1;
              playerAggressionScoreRef.current += 4;
              emitBotEvent({ type: "player_tetris" });
              if (playerB2BRef.current >= 2) {
                playerAggressionScoreRef.current += 2;
                emitBotEvent({ type: "player_back_to_back" });
              }
            } else if (linesCleared > 0) {
              playerB2BRef.current = 0;
            }
          }}
          onBoardUpdate={(board) => {
            playerBoardRef.current = board;
            const now = Date.now();
            const previousTs = lastBoardSampleAtRef.current;
            if (previousTs !== null && inRedZoneRef.current) {
              redZoneTimeMsRef.current += Math.max(0, now - previousTs);
            }
            lastBoardSampleAtRef.current = now;
            const height = getStackHeight(board);
            playerStackHeightRef.current = height;
            playerStackSumRef.current += height;
            playerStackSamplesRef.current += 1;
            inRedZoneRef.current = height >= RED_ZONE_HEIGHT;
            if (height > maxStackHeightRef.current) {
              maxStackHeightRef.current = height;
            }
            if (height >= RED_ZONE_HEIGHT && !playerHighStackAnnouncedRef.current) {
              playerHighStackAnnouncedRef.current = true;
              emitBotEvent({ type: "player_high_stack" });
              if (!highRiskAnnouncedRef.current) {
                const bothNearDanger =
                  playerStackHeightRef.current >= RED_ZONE_HEIGHT &&
                  botStackHeightRef.current >= RED_ZONE_HEIGHT - ADAPTIVE.highRisk.botDangerBuffer;
                if (
                  bothNearDanger &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.highRisk.minMatchMs,
                    minLines: ADAPTIVE.highRisk.minLines,
                  })
                ) {
                  highRiskAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_high_risk" });
                }
              }
            }
            const nearDanger =
              playerStackHeightRef.current >= RED_ZONE_HEIGHT - 1 &&
              botStackHeightRef.current >= RED_ZONE_HEIGHT - 1;
            if (nearDanger && !closeCallAnnouncedRef.current) {
              closeCallAnnouncedRef.current = true;
              emitBotEvent({ type: "close_call" });
            }
          }}
          onScoreChange={(score) => {
            playerLiveScoreRef.current = score;
            maybeEmitComeback();
            const now = Date.now();
            if (now - lastTrollAtRef.current >= MEMORY_TIMING.trollCooldownMs) {
              const troll = getScoreTrollDialogue(
                botPersonality,
                playerLiveScoreRef.current,
                botLiveScoreRef.current
              );
              if (troll) {
                emitCustomBotLine(
                  troll,
                  botPersonality.id === "apex" ? "evil" : "thinking"
                );
                lastTrollAtRef.current = now;
              }
            }
          }}
          onLocalGameOver={(score, lines) => {
            const now = Date.now();
            if (lastBoardSampleAtRef.current !== null && inRedZoneRef.current) {
              redZoneTimeMsRef.current += Math.max(0, now - lastBoardSampleAtRef.current);
            }
            lastBoardSampleAtRef.current = now;
            setPlayerResult({ score, lines });
            if (startTimeRef.current) {
              runDurationRef.current = Date.now() - startTimeRef.current;
            }
          }}
          hideGameOverOverlay
          paused={matchOver}
          onGameStart={() => {
            resetRunTracking();
            startTimeRef.current = Date.now();
            if (!matchStartAnnouncedRef.current) {
              matchStartAnnouncedRef.current = true;
              emitBotEvent({ type: "match_start" }, true);
            }
          }}
          onHold={() => {
            holdCountRef.current += 1;
          }}
          onHardDrop={() => {
            hardDropCountRef.current += 1;
          }}
          onLevelChange={(level) => {
            levelRef.current = level;
          }}
        />

        <div className="flex flex-col gap-2 items-center">
          <p className="text-xs text-gray-300 mb-2">Grille Tetrobots</p>
          <TetrobotsAvatar mood={botMood} personalityId={botPersonality.id} />
          <div style={{ height: 16, width: "100%" }} />
          <div className="mb-4">
            <OpponentBoard board={botBoard} />
          </div>
          {botMessage && (
            <>
              <div style={{ height: 16, width: "100%" }} />
              <BotSpeechBubble
                message={botMessage}
                speaker={botPersonality.name}
                accentColor={botBubbleAccent}
              />
            </>
          )}
          {botWaiting && <p className="text-green-300">Tetrobots réfléchit...</p>}
          {!!botResult && <p className="text-yellow-300">Tetrobots a terminé</p>}
        </div>
      </div>

      <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }}>
        <TetrisBoard
          mode="VERSUS"
          scoreMode={null}
          rng={botRng}
          keyboardControlsEnabled={false}
          tetrobotsPersonalityId={botPersonalityId}
          tetrobotsAdaptiveContext={{
            playerAvgStackHeight:
              playerStackSamplesRef.current > 0
                ? playerStackSumRef.current / playerStackSamplesRef.current
                : playerStackHeightRef.current,
            playerAggressionScore: playerAggressionScoreRef.current,
          }}
          incomingGarbage={botIncomingGarbage}
          onGarbageConsumed={() => setBotIncomingGarbage(0)}
          onConsumeLines={(lines) => {
            const garbage = mapGarbage(lines);
            if (garbage > 0) {
              setPlayerIncomingGarbage((prev) => prev + garbage);
            }
          }}
          onLinesCleared={(linesCleared) => {
            if (linesCleared > 0) {
              botLiveLinesRef.current += linesCleared;
              if (linesCleared === 4) {
                emitBotEvent({ type: "bot_tetris" });
              }
            }
          }}
          onTetrobotsPlan={({ isBlunder, strategy }) => {
            if (isBlunder) {
              botBlunderRef.current = true;
              emitBotEvent({ type: "bot_blunder" });
              if (botStrategyRef.current !== "neutral") {
                if (
                  botStrategyShiftCountRef.current >= ADAPTIVE.failedAdaptation.minStrategyShifts &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.failedAdaptation.minMatchMs,
                    minLines: ADAPTIVE.failedAdaptation.minLines,
                  })
                ) {
                  botFailedAdaptationRef.current = true;
                  emitBotEvent({ type: "bot_failed_adaptation" });
                }
              }
            }
            if (botStrategyRef.current !== strategy) {
              const previousStrategy = botStrategyRef.current;
              botStrategyRef.current = strategy;
              botStrategyShiftCountRef.current += 1;
              if (strategy === "pressure") {
                botSawPressureRef.current = true;
                botExploitPatternCountRef.current += 1;
              }
              if (strategy === "defensive") {
                botSawDefensiveRef.current = true;
              }
              if (
                canEmitAdaptiveEvent({
                  minMatchMs: ADAPTIVE.strategyShift.minMatchMs,
                  minLines: ADAPTIVE.strategyShift.minLines,
                })
              ) {
                emitBotEvent({ type: "bot_strategy_shift", from: previousStrategy, to: strategy });
              }
              if (strategy === "panic") {
                botTriggeredPanicRef.current = true;
                if (
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.panicMode.minMatchMs,
                    minLines: ADAPTIVE.panicMode.minLines,
                    minIntervalMs: ADAPTIVE.panicMode.minIntervalMs,
                  })
                ) {
                  emitBotEvent({ type: "bot_panic_mode" });
                }
              } else if (previousStrategy === "panic") {
                if (
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.recovered.minMatchMs,
                    minLines: ADAPTIVE.recovered.minLines,
                    minIntervalMs: ADAPTIVE.recovered.minIntervalMs,
                  })
                ) {
                  emitBotEvent({ type: "bot_recovered" });
                }
              }
              if (strategy === "defensive" && !aggressiveDetectAnnouncedRef.current) {
                if (
                  playerAggressionScoreRef.current >= ADAPTIVE.detectAggressive.minAggression &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.detectAggressive.minMatchMs,
                    minLines: ADAPTIVE.detectAggressive.minLines,
                  })
                ) {
                  aggressiveDetectAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_aggressive_player" });
                }
              }
              if (strategy === "aggressive" && !defensiveDetectAnnouncedRef.current) {
                const avgHeight =
                  playerStackSamplesRef.current > 0
                    ? playerStackSumRef.current / playerStackSamplesRef.current
                    : playerStackHeightRef.current;
                if (
                  avgHeight <= ADAPTIVE.detectDefensive.maxAvgHeight &&
                  playerAggressionScoreRef.current <= ADAPTIVE.detectDefensive.maxAggression &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.detectDefensive.minMatchMs,
                    minLines: ADAPTIVE.detectDefensive.minLines,
                  })
                ) {
                  defensiveDetectAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_detect_defensive_player" });
                }
              }
              if (strategy === "pressure" && !exploitingPatternAnnouncedRef.current) {
                if (
                  botStrategyShiftCountRef.current >= ADAPTIVE.exploitPattern.minStrategyShifts &&
                  playerStackSamplesRef.current >= ADAPTIVE.exploitPattern.minSamples &&
                  canEmitAdaptiveEvent({
                    minMatchMs: ADAPTIVE.exploitPattern.minMatchMs,
                    minLines: ADAPTIVE.exploitPattern.minLines,
                  })
                ) {
                  exploitingPatternAnnouncedRef.current = true;
                  emitBotEvent({ type: "bot_exploiting_player_pattern" });
                }
              }
              if (
                botStrategyShiftCountRef.current >= ADAPTIVE.analysisComplete.minStrategyShifts &&
                !analysisCompleteAnnouncedRef.current &&
                canEmitAdaptiveEvent({
                  minMatchMs: ADAPTIVE.analysisComplete.minMatchMs,
                  minLines: ADAPTIVE.analysisComplete.minLines,
                  minIntervalMs: ADAPTIVE.analysisComplete.minIntervalMs,
                })
              ) {
                analysisCompleteAnnouncedRef.current = true;
                botAnalysisCompleteRef.current = true;
                emitBotEvent({ type: "bot_analysis_complete" });
              }
            }
          }}
          onBoardUpdate={(board) => {
            setBotBoard(board);
            botBoardRef.current = board;
            botStackHeightRef.current = getStackHeight(board);
          }}
          onScoreChange={(score) => {
            botLiveScoreRef.current = score;
            maybeEmitComeback();
            const now = Date.now();
            if (now - lastTrollAtRef.current >= MEMORY_TIMING.trollCooldownMs) {
              const troll = getScoreTrollDialogue(
                botPersonality,
                playerLiveScoreRef.current,
                botLiveScoreRef.current
              );
              if (troll) {
                emitCustomBotLine(
                  troll,
                  botPersonality.id === "apex" ? "evil" : "thinking"
                );
                lastTrollAtRef.current = now;
              }
            }
          }}
          onLocalGameOver={(score, lines) => {
            setBotResult({ score, lines });
          }}
          hideGameOverOverlay
          paused={matchOver}
        />
      </div>

      <FullScreenOverlay show={botWaiting}>
        <div className="flex flex-col gap-3 items-center text-white text-lg font-bold">
          <p>Tetrobots termine sa partie...</p>
        </div>
      </FullScreenOverlay>

      <FullScreenOverlay show={matchOver}>
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ff00ff",
            borderRadius: "12px",
            padding: "24px 28px",
            minWidth: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
            color: "white",
            textAlign: "center",
            boxShadow: "0 0 20px #ff00ff",
          }}
        >
          <h2 className="text-xl text-yellow-300">Résultats</h2>
          <p>Toi : {myScore} pts / {myLines} lignes</p>
          <p>Tetrobots : {botScore} pts / {botLines} lignes</p>
          <p className="text-cyan-300">{myScore > botScore ? "Victoire" : myScore < botScore ? "Défaite" : "Égalité"}</p>
          <div className="flex gap-4 mt-2">
            <button className="retro-btn" onClick={startMatch}>
              Rejouer
            </button>
            <button className="retro-btn" onClick={backToLobby}>
              Retour lobby
            </button>
          </div>
        </div>
      </FullScreenOverlay>
    </div>
  );
}

export default function Versus() {
  const [searchParams] = useSearchParams();
  const queue = (searchParams.get("queue") ?? "pvp").toLowerCase();

  if (queue === "bot") {
    return <VersusTetrobots />;
  }

  return <VersusPvp />;
}
