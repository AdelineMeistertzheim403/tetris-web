import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { useVersusSocket } from "../hooks/useVersusSocket";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import OpponentBoard from "../../game/components/board/OpponentBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { saveVersusMatch } from "../../game/services/scoreService";
import { useAchievements } from "../../achievements/hooks/useAchievements";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

// Seuil de “zone rouge” pour détecter une victoire “parfaite”.
const RED_ZONE_HEIGHT = 16;

export default function Versus() {
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [manualMatchId, setManualMatchId] = useState("");
  const [chosenMatchId, setChosenMatchId] = useState<string | undefined>(undefined);
  const visitedRef = useRef(false);
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

  // Réinitialise les compteurs locaux pour les stats/achievements.
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

  // L’ID effectif de match est soit l’ID choisi, soit l’ID tapé.
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
    // Marque le mode Versus comme visité (achievements).
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, VERSUS: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= 4 },
    });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    // À chaque match, on réinitialise le tracking local.
    if (currentMatchId) {
      resetRunTracking();
    }
  }, [currentMatchId]);

  useEffect(() => {
    // Sauvegarde du match : un seul joueur (slot 1) écrit pour éviter les doublons.
    if (!matchOver || !results || slot === null || !user || hasSavedResult) return;
    // Pour Ã©viter deux Ã©critures (une par joueur), seul le slot 1 sauvegarde
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

    saveVersusMatch(payload).catch((err) => console.error("Erreur enregistrement match versus :", err));
    setHasSavedResult(true);
  }, [currentMatchId, hasSavedResult, matchOver, playersInfo, results, slot, user]);

  useEffect(() => {
    // Calcul final des achievements quand le match est terminé.
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
        scored_all_modes: countTrue(next.scoredModes) >= 4,
        modes_visited_all: countTrue(next.modesVisited) >= 4,
        same_score_twice: sameScoreTwice,
      },
    });

    finalizedRef.current = true;
  }, [matchOver, results, slot, updateStats, checkAchievements]);

  if (startReady) {
    // Match prêt : rendu de la partie en direct (local + adversaire).
    const myResult = results?.find((r) => r.slot === slot) ?? null;
    const oppResult = results?.find((r) => r.slot !== slot) ?? null;

    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative">
        <h1 className="text-3xl text-yellow-400 mb-4 drop-shadow-[0_0_15px_#ff00ff]">
          Partie VS
        </h1>
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
            {opponentFinished && !matchOver && (
              <p className="text-green-300">Adversaire a terminé</p>
            )}
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
            <p>
              Toi : {myResult ? `${myResult.score} pts / ${myResult.lines} lignes` : "n/a"}
            </p>
            <p>
              Adversaire :{" "}
              {oppResult ? `${oppResult.score} pts / ${oppResult.lines} lignes` : "n/a"}
            </p>
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
      <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">
        Mode Versus (beta)
      </h1>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-5 w-[90%]"
        style={{ maxWidth: "820px" }}
      >
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
