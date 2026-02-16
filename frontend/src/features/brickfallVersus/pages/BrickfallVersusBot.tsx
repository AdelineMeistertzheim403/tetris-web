import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import BrickfallBoard from "../components/BrickfallBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { BRICKFALL_BALANCE, type BrickfallRole } from "../config/balance";
import { saveBrickfallVersusMatch } from "../../game/services/scoreService";
import {
  TETROBOTS_PERSONALITIES,
  getTetrobotsPersonality,
  type TetrobotsPersonality,
} from "../../game/ai/tetrobots";
import { createRng } from "../../../shared/utils/rng";

const BRICKFALL_ROWS = BRICKFALL_BALANCE.board.rows;
const TETRIS_COLS = BRICKFALL_BALANCE.board.tetrisCols;
const BRICKFALL_COLS = BRICKFALL_BALANCE.board.brickfallCols;
const BRICKFALL_TETRIS_OFFSET = BRICKFALL_BALANCE.board.tetrisOffset;

type EndResult = { slot: number; score: number; lines: number };
type ArchitectOverlayMarker = {
  id: string;
  x: number;
  y: number;
  type: "hit" | "opponent_ball" | "opponent_paddle";
};

function projectArchitectBoardToBrickfall(
  board: number[][],
  brickfallCols: number,
  offset: number
) {
  return board.map((row) => {
    const projected = Array.from({ length: brickfallCols }, () => 0);
    for (let x = 0; x < row.length; x += 1) {
      const targetX = x + offset;
      if (targetX < 0 || targetX >= brickfallCols) continue;
      projected[targetX] = row[x] ? 1 : 0;
    }
    return projected;
  });
}

function createInitialArchitectBoard(rows: number, cols: number) {
  const board = Array.from({ length: rows }, () => Array(cols).fill(0));
  const startRow = Math.max(0, rows - BRICKFALL_BALANCE.board.initialFilledRows);
  for (let y = startRow; y < rows; y += 1) {
    const gapCount = 2 + Math.floor(Math.random() * 2);
    const gaps = new Set<number>();
    while (gaps.size < gapCount) {
      gaps.add(Math.floor(Math.random() * cols));
    }
    for (let x = 0; x < cols; x += 1) {
      board[y][x] = gaps.has(x) ? 0 : 1;
    }
  }
  return board;
}

export default function BrickfallVersusTetrobots() {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const [roundSeed, setRoundSeed] = useState(`brickfall-bot-${Date.now()}`);
  const [hasSavedResult, setHasSavedResult] = useState(false);
  const [playerRole, setPlayerRole] = useState<BrickfallRole>("ARCHITECT");
  const [botPersonalityId, setBotPersonalityId] = useState<TetrobotsPersonality["id"]>("balanced");
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [matchOver, setMatchOver] = useState(false);
  const [results, setResults] = useState<EndResult[] | null>(null);
  const [roundMessage, setRoundMessage] = useState<string | null>(null);
  const [botTargetBoard, setBotTargetBoard] = useState<number[][] | null>(null);
  const [playerIncomingGarbage, setPlayerIncomingGarbage] = useState(0);
  const [botIncomingGarbage, setBotIncomingGarbage] = useState(0);
  const [botLives, setBotLives] = useState(BRICKFALL_BALANCE.demolisher.startLives);
  const [botDebuff, setBotDebuff] = useState<string | null>(null);
  const [botSpawnType, setBotSpawnType] = useState<
    "normal" | "armored" | "bomb" | "cursed" | "mirror" | null
  >(null);
  const [botSpawnToken, setBotSpawnToken] = useState(0);
  const [botGravityMultiplier, setBotGravityMultiplier] = useState(1);
  const [botHoldDisabled, setBotHoldDisabled] = useState(false);
  const [externalBoardEdits, setExternalBoardEdits] = useState<Array<{ x: number; y: number }>>([]);
  const [externalBoardEditToken, setExternalBoardEditToken] = useState(0);
  const [initialArchitectBoard, setInitialArchitectBoard] = useState<number[][] | null>(null);
  const [architectVisualMarkers, setArchitectVisualMarkers] = useState<ArchitectOverlayMarker[]>([]);
  const [architectHitMarkers, setArchitectHitMarkers] = useState<ArchitectOverlayMarker[]>([]);
  const [playerBallSpeedMultiplier, setPlayerBallSpeedMultiplier] = useState(1.25);

  const finalizedRef = useRef(false);
  const playerLinesRef = useRef(0);
  const botLinesRef = useRef(0);
  const playerBlocksDestroyedRef = useRef(0);
  const botBlocksDestroyedRef = useRef(0);
  const botDemolisherProgressRef = useRef(0);
  const playerDestroyProgressRef = useRef(0);
  const playerBoardRef = useRef<number[][] | null>(null);
  const botComboRef = useRef(0);
  const playerScoreRef = useRef(0);
  const botScoreRef = useRef(0);
  const markerTimeoutsRef = useRef<number[]>([]);
  const botSimRef = useRef({
    ballX: TETRIS_COLS / 2,
    ballY: 2.3,
    vx: 0.18,
    vy: 0.24,
    paddleX: TETRIS_COLS / 2 - 1.5,
    paddleWidth: 3,
  });

  const botPersonality = useMemo(
    () => getTetrobotsPersonality(botPersonalityId),
    [botPersonalityId]
  );
  const botRng = useMemo(
    () => createRng(`${roundSeed}-${botPersonality.id}`),
    [botPersonality.id, roundSeed]
  );
  const playerRng = useMemo(() => createRng(`${roundSeed}-player`), [roundSeed]);
  const playerIsArchitect = playerRole === "ARCHITECT";
  const boardsPaused = countdownLabel !== null || matchOver;

  const clearMarkerTimers = () => {
    markerTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    markerTimeoutsRef.current = [];
  };

  const enqueueHitMarker = (x: number, y: number) => {
    const id = `hit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setArchitectHitMarkers((prev) => [...prev, { id, x, y, type: "hit" }]);
    const timeoutId = window.setTimeout(() => {
      setArchitectHitMarkers((prev) => prev.filter((m) => m.id !== id));
    }, 120);
    markerTimeoutsRef.current.push(timeoutId);
  };

  const finalizeMatch = (
    _winnerRole: BrickfallRole,
    reason: string
  ) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    setRoundMessage(reason);
    setMatchOver(true);

    const playerSlot = playerIsArchitect ? 1 : 2;
    const botSlot = playerIsArchitect ? 2 : 1;
    const playerScore = playerIsArchitect
      ? Math.round(playerScoreRef.current)
      : playerBlocksDestroyedRef.current * 100;
    const botScore = playerIsArchitect
      ? botBlocksDestroyedRef.current * 100
      : Math.round(botScoreRef.current);

    const playerLines = playerIsArchitect ? playerLinesRef.current : playerBlocksDestroyedRef.current;
    const botLines = playerIsArchitect ? botBlocksDestroyedRef.current : botLinesRef.current;

    const nextResults: EndResult[] = [
      { slot: playerSlot, score: playerScore, lines: playerLines },
      { slot: botSlot, score: botScore, lines: botLines },
    ].sort((a, b) => a.slot - b.slot);
    setResults(nextResults);
  };

  useEffect(() => {
    return () => {
      clearMarkerTimers();
    };
  }, []);

  useEffect(() => {
    if (!matchOver) return;
    clearMarkerTimers();
    setArchitectHitMarkers([]);
    setArchitectVisualMarkers([]);
  }, [matchOver]);

  useEffect(() => {
    if (!started || !startAt) {
      setCountdownLabel(null);
      return;
    }
    const tick = () => {
      const msLeft = startAt - Date.now();
      if (msLeft > 0) {
        setCountdownLabel(String(Math.ceil(msLeft / 1000)));
        return;
      }
      if (msLeft > -700) {
        setCountdownLabel("GO");
        return;
      }
      setCountdownLabel(null);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startAt, started]);

  // IA démolisseur: simulation balle + raquette pour attaquer la grille architecte.
  useEffect(() => {
    if (!started || !playerIsArchitect || boardsPaused) return;
    let rafId = 0;
    let lastTs = performance.now();
    let visualTick = 0;
    let hitCooldownMs = 0;

    const step = (ts: number) => {
      const dtMs = Math.min(32, ts - lastTs);
      lastTs = ts;
      if (matchOver) return;

      const board = playerBoardRef.current;
      if (!board || board.length === 0) {
        rafId = requestAnimationFrame(step);
        return;
      }

      const profile =
        botPersonalityId === "apex"
          ? { speedFactor: 1.2, jitter: 0.2, maxMove: 0.4, hitChance: 0.93, minCooldown: 70 }
          : botPersonalityId === "balanced"
            ? { speedFactor: 1.0, jitter: 0.5, maxMove: 0.28, hitChance: 0.75, minCooldown: 110 }
            : { speedFactor: 0.62, jitter: 1.6, maxMove: 0.16, hitChance: 0.45, minCooldown: 190 };
      const speedFactor = profile.speedFactor;
      const sim = botSimRef.current;
      const paddleY = 1.2;
      const ballRadius = 0.22;

      // IA raquette: suit la balle avec une petite erreur selon la difficulté.
      const targetPaddleCenter = sim.ballX + (botRng() - 0.5) * profile.jitter;
      const currentCenter = sim.paddleX + sim.paddleWidth / 2;
      const maxMove = (dtMs / 16) * profile.maxMove;
      const delta = Math.max(-maxMove, Math.min(maxMove, targetPaddleCenter - currentCenter));
      sim.paddleX = Math.max(0, Math.min(TETRIS_COLS - sim.paddleWidth, sim.paddleX + delta));

      sim.ballX += sim.vx * (dtMs / 16) * speedFactor;
      sim.ballY += sim.vy * (dtMs / 16) * speedFactor;
      hitCooldownMs = Math.max(0, hitCooldownMs - dtMs);

      // Murs/haut
      if (sim.ballX - ballRadius <= 0) {
        sim.ballX = ballRadius;
        sim.vx = Math.abs(sim.vx);
      } else if (sim.ballX + ballRadius >= TETRIS_COLS) {
        sim.ballX = TETRIS_COLS - ballRadius;
        sim.vx = -Math.abs(sim.vx);
      }
      // Raquette (en haut de la grille côté architecte).
      if (
        sim.ballY - ballRadius <= paddleY + 0.6 &&
        sim.ballY - ballRadius >= paddleY - 0.5 &&
        sim.vy < 0
      ) {
        if (sim.ballX >= sim.paddleX && sim.ballX <= sim.paddleX + sim.paddleWidth) {
          const hit = (sim.ballX - sim.paddleX) / sim.paddleWidth - 0.5;
          sim.vy = Math.abs(sim.vy);
          sim.vx += hit * 0.14;
        }
      }
      if (sim.ballY - ballRadius <= 0 && sim.vy < 0) {
        sim.ballY = ballRadius;
        sim.vy = Math.abs(sim.vy);
      }

      // Collision bloc
      const cellX = Math.floor(sim.ballX);
      const cellY = Math.floor(sim.ballY);
      if (
        hitCooldownMs <= 0 &&
        cellY >= 0 &&
        cellY < BRICKFALL_ROWS &&
        cellX >= 0 &&
        cellX < TETRIS_COLS &&
        board[cellY]?.[cellX]
      ) {
        sim.vy = -sim.vy;
        hitCooldownMs = profile.minCooldown;
        if (botRng() < profile.hitChance) {
          enqueueHitMarker(cellX, cellY);
          setExternalBoardEdits([{ x: cellX, y: cellY }]);
          setExternalBoardEditToken((prev) => prev + 1);
          botBlocksDestroyedRef.current += 1;
          botDemolisherProgressRef.current += 1;
          while (
            botDemolisherProgressRef.current >=
            BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger
          ) {
            botDemolisherProgressRef.current -=
              BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger;
            setPlayerIncomingGarbage((prev) =>
              Math.min(prev + 1, BRICKFALL_BALANCE.match.maxBufferedGarbage)
            );
          }
        }
      }

      // Si la balle tombe sous la grille, reset depuis la raquette.
      if (sim.ballY > BRICKFALL_ROWS + 0.5) {
        sim.ballX = sim.paddleX + sim.paddleWidth / 2;
        sim.ballY = 2.3;
        sim.vx = (botRng() - 0.5) * 0.42;
        sim.vy = 0.24;
      }

      visualTick += dtMs;
      if (visualTick >= 40) {
        visualTick = 0;
        const paddleYCell = 1;
        const paddleStart = Math.max(0, Math.floor(sim.paddleX));
        const paddleEnd = Math.min(TETRIS_COLS - 1, Math.floor(sim.paddleX + sim.paddleWidth));
        const paddleMarkers: ArchitectOverlayMarker[] = [];
        for (let x = paddleStart; x <= paddleEnd; x += 1) {
          paddleMarkers.push({ id: `pad-${x}`, x, y: paddleYCell, type: "opponent_paddle" });
        }
        const ballMarker: ArchitectOverlayMarker = {
          id: "ball",
          x: Math.max(0, Math.min(TETRIS_COLS - 1, Math.floor(sim.ballX))),
          y: Math.max(0, Math.min(BRICKFALL_ROWS - 1, Math.floor(sim.ballY))),
          type: "opponent_ball",
        };
        setArchitectVisualMarkers([...paddleMarkers, ballMarker]);
      }

      rafId = requestAnimationFrame(step);
    };

    // Reset de la simulation au début du round.
    botSimRef.current = {
      ballX: TETRIS_COLS / 2,
      ballY: 2.3,
      vx: (botRng() - 0.5) * 0.38,
      vy: 0.24,
      paddleX: TETRIS_COLS / 2 - 1.5,
      paddleWidth: 3,
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [boardsPaused, botPersonalityId, botRng, matchOver, playerIsArchitect, started]);

  useEffect(() => {
    if (!matchOver || !results || !user || hasSavedResult) return;
    const playerSlot = playerIsArchitect ? 1 : 2;
    const botSlot = playerIsArchitect ? 2 : 1;
    const me = results.find((r) => r.slot === playerSlot);
    const bot = results.find((r) => r.slot === botSlot);
    if (!me || !bot) return;

    saveBrickfallVersusMatch({
      matchId: roundSeed,
      players: [
        {
          slot: playerSlot,
          userId: user.id,
          pseudo: user.pseudo,
          role: playerRole,
          score: me.score,
          lines: me.lines,
        },
        {
          slot: botSlot,
          pseudo: botPersonality.name,
          role: playerRole === "ARCHITECT" ? "DEMOLISHER" : "ARCHITECT",
          score: bot.score,
          lines: bot.lines,
        },
      ],
    }).catch((err) => {
      console.error("Erreur sauvegarde Brickfall vs Tetrobots:", err);
    });
    setHasSavedResult(true);
  }, [botPersonality.name, hasSavedResult, matchOver, playerIsArchitect, playerRole, results, roundSeed, user]);

  const startMatch = () => {
    setRoundSeed(`brickfall-bot-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`);
    setRoundKey((v) => v + 1);
    setStarted(true);
    setMatchOver(false);
    setResults(null);
    setRoundMessage(null);
    setHasSavedResult(false);
    setBotTargetBoard(null);
    setPlayerIncomingGarbage(0);
    setBotIncomingGarbage(0);
    setBotLives(BRICKFALL_BALANCE.demolisher.startLives);
    setBotDebuff(null);
    setBotSpawnType(null);
    setBotSpawnToken(0);
    setBotGravityMultiplier(1);
    setBotHoldDisabled(false);
    setPlayerBallSpeedMultiplier(1.25);
    setExternalBoardEdits([]);
    setExternalBoardEditToken(0);
    setInitialArchitectBoard(createInitialArchitectBoard(BRICKFALL_ROWS, TETRIS_COLS));
    setArchitectVisualMarkers([]);
    setArchitectHitMarkers([]);
    clearMarkerTimers();
    finalizedRef.current = false;
    playerLinesRef.current = 0;
    botLinesRef.current = 0;
    playerBlocksDestroyedRef.current = 0;
    botBlocksDestroyedRef.current = 0;
    playerScoreRef.current = 0;
    botScoreRef.current = 0;
    botDemolisherProgressRef.current = 0;
    playerDestroyProgressRef.current = 0;
    botComboRef.current = 0;
    playerBoardRef.current = null;
    setCountdownLabel("3");
    setStartAt(Date.now() + 3000);
  };

  const backToLobby = () => {
    setStarted(false);
    setMatchOver(false);
    setResults(null);
    setRoundMessage(null);
    setCountdownLabel(null);
    setStartAt(null);
    setHasSavedResult(false);
    setArchitectVisualMarkers([]);
    setArchitectHitMarkers([]);
    clearMarkerTimers();
  };

  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-10">
        <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">
          Brickfall Versus - Solo
        </h1>
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
            <label className="text-xs text-yellow-300 uppercase tracking-wide">Ton rôle</label>
            <select
              value={playerRole}
              onChange={(e) => setPlayerRole(e.target.value as BrickfallRole)}
              className="retro-select w-full"
            >
              <option value="ARCHITECT">Architecte (Tetris)</option>
              <option value="DEMOLISHER">Démolisseur (Casse-brique)</option>
            </select>

            <label className="text-xs text-yellow-300 uppercase tracking-wide mt-1">
              Adversaire bot
            </label>
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

  const playerSlot = playerIsArchitect ? 1 : 2;
  const botSlot = playerIsArchitect ? 2 : 1;
  const me = results?.find((r) => r.slot === playerSlot) ?? null;
  const bot = results?.find((r) => r.slot === botSlot) ?? null;

  return (
    <div
      className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative"
      key={roundKey}
    >
      <h1 className="text-3xl text-yellow-400 mb-2 drop-shadow-[0_0_15px_#ff00ff]">
        Brickfall VS Tetrobots
      </h1>
      <p className="text-xs text-cyan-200 mb-4">
        {botPersonality.name} - {botPersonality.difficultyLabel} • Tu es{" "}
        {playerIsArchitect ? "Architecte" : "Démolisseur"}
      </p>

      <div className="flex gap-6 items-start">
        <div className="rounded-xl border border-cyan-500 bg-black/60 p-4 w-[290px] text-left text-xs space-y-2">
          <h2 className="text-cyan-200 text-sm">HUD Match</h2>
          <div>Rôle joueur: {playerIsArchitect ? "Architecte" : "Démolisseur"}</div>
          <div>Rôle bot: {playerIsArchitect ? "Démolisseur" : "Architecte"}</div>
          <div>
            Bot perf:{" "}
            {playerIsArchitect
              ? `${botBlocksDestroyedRef.current} blocs détruits`
              : `${botLinesRef.current} lignes posées`}
          </div>
          {playerIsArchitect ? (
            <>
              <div>Vies bot: {botLives}</div>
              <div>Pression reçue: {playerIncomingGarbage}</div>
            </>
          ) : (
            <>
              <div>Débris envoyés au bot: {botIncomingGarbage}</div>
              <div>Blocs détruits joueur: {playerBlocksDestroyedRef.current}</div>
            </>
          )}
          {roundMessage && <div className="text-yellow-300">{roundMessage}</div>}
        </div>

        {playerIsArchitect ? (
          <TetrisBoard
            mode="BRICKFALL_VERSUS"
            scoreMode={null}
            rows={BRICKFALL_ROWS}
            cols={TETRIS_COLS}
            initialBoard={initialArchitectBoard ?? undefined}
            rng={playerRng}
            incomingGarbage={playerIncomingGarbage}
            onGarbageConsumed={() => setPlayerIncomingGarbage(0)}
            externalBoardEdits={externalBoardEdits}
            externalBoardEditToken={externalBoardEditToken}
            externalBoardEditEffect="none"
            externalSpecialMarkers={[...architectVisualMarkers, ...architectHitMarkers]}
            onConsumeLines={(lines) => {
              if (lines <= 0) return;
              playerLinesRef.current += lines;
              const damage = lines >= 4 ? 2 : lines >= 2 ? 1 : 0;
              if (damage > 0) {
                setBotLives((prev) => {
                  const next = Math.max(0, prev - damage);
                  if (next === 0) {
                    finalizeMatch("ARCHITECT", "Tetrobots démolisseur est à court de balles");
                  }
                  return next;
                });
              }
            }}
            onScoreChange={(score) => {
              playerScoreRef.current = score;
            }}
            onBoardUpdate={(board) => {
              playerBoardRef.current = board;
            }}
            onLocalGameOver={() => {
              finalizeMatch("DEMOLISHER", "Pile au sommet: tu perds côté Architecte");
            }}
            hideGameOverOverlay
            autoStart={false}
            paused={boardsPaused}
          />
        ) : (
          <BrickfallBoard
            rows={BRICKFALL_ROWS}
            cols={BRICKFALL_COLS}
            cellSize={30}
            targetBoard={botTargetBoard}
            speedMultiplier={playerBallSpeedMultiplier}
            debuff={botDebuff}
            interactive
            canLaunch
            paused={boardsPaused}
            spawnBlockType={botSpawnType}
            spawnToken={botSpawnToken}
            onBlocksDestroyed={(count) => {
              playerBlocksDestroyedRef.current += count;
              playerDestroyProgressRef.current += count;
              while (
                playerDestroyProgressRef.current >=
                BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger
              ) {
                playerDestroyProgressRef.current -=
                  BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger;
                setBotIncomingGarbage((prev) =>
                  Math.min(prev + 1, BRICKFALL_BALANCE.match.maxBufferedGarbage)
                );
              }
            }}
            onLifeDepleted={() => {
              finalizeMatch("ARCHITECT", "Plus de balles: tu perds côté Démolisseur");
            }}
            onBombDestroyed={() => {
              setBotGravityMultiplier(1.3);
              setTimeout(() => setBotGravityMultiplier(1), 4500);
            }}
            onCursedHit={() => {
              setBotHoldDisabled(true);
              setTimeout(() => setBotHoldDisabled(false), 6000);
            }}
          />
        )}

      </div>

      {/* Bot architecte: partie Tetris simulée hors écran */}
      {!playerIsArchitect && (
        <div
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            width: 0,
            height: 0,
            overflow: "hidden",
          }}
        >
          <TetrisBoard
            mode="BRICKFALL_VERSUS"
            scoreMode={null}
            rows={BRICKFALL_ROWS}
            cols={TETRIS_COLS}
            rng={botRng}
            keyboardControlsEnabled={false}
            tetrobotsPersonalityId={botPersonalityId}
            incomingGarbage={botIncomingGarbage}
            onGarbageConsumed={() => setBotIncomingGarbage(0)}
            gravityMultiplier={botGravityMultiplier}
            disableHold={botHoldDisabled}
            onConsumeLines={(lines) => {
              if (lines <= 0) {
                botComboRef.current = 0;
                return;
              }
              setPlayerBallSpeedMultiplier((prev) =>
                Math.min(2.2, prev + lines * 0.08)
              );
              botLinesRef.current += lines;
              botComboRef.current += 1;
              if (lines === 1) setBotSpawnType("normal");
              if (lines === 2) setBotSpawnType("armored");
              if (lines === 4) setBotSpawnType("bomb");
              if (botComboRef.current >= 3 && botRng() < 0.35) setBotDebuff("random_gravity");
              if (lines === 4 && botRng() < 0.3) setBotDebuff("paddle_shrink");
              setBotSpawnToken((prev) => prev + 1);
            }}
            onScoreChange={(score) => {
              botScoreRef.current = score;
            }}
            onBoardUpdate={(board) => {
              setBotTargetBoard(
                projectArchitectBoardToBrickfall(board, BRICKFALL_COLS, BRICKFALL_TETRIS_OFFSET)
              );
            }}
            onLocalGameOver={() => {
              finalizeMatch("DEMOLISHER", "Tetrobots Architecte a top-out");
            }}
            hideGameOverOverlay
            autoStart={false}
            paused={boardsPaused}
          />
        </div>
      )}

      {countdownLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-6xl text-yellow-300 drop-shadow-[0_0_16px_#ff00ff]">
            {countdownLabel}
          </div>
        </div>
      )}

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
          <p>Toi : {me ? `${me.score} pts / ${me.lines} lignes` : "n/a"}</p>
          <p>Tetrobots : {bot ? `${bot.score} pts / ${bot.lines} lignes` : "n/a"}</p>
          <p className="text-cyan-300">
            {me && bot
              ? me.score > bot.score
                ? "Victoire"
                : me.score < bot.score
                  ? "Défaite"
                  : "Égalité"
              : "Match terminé"}
          </p>
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
