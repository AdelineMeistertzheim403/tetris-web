import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { useBrickfallVersusSocket } from "../hooks/useBrickfallVersusSocket";
import { useBrickfallGame } from "../hooks/useBrickfallGame";
import BrickfallBoard from "../components/BrickfallBoard";
import { BRICKFALL_BALANCE } from "../config/balance";
import type { BrickfallRole, BrickfallWinReason } from "../config/balance";
import { recordBrickfallRound } from "../utils/matchStats";
import { saveBrickfallVersusMatch } from "../../game/services/scoreService";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import BrickfallVersusTetrobots from "./BrickfallVersusBot";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

const BRICKFALL_ROWS = BRICKFALL_BALANCE.board.rows;
const TETRIS_COLS = BRICKFALL_BALANCE.board.tetrisCols;
const BRICKFALL_COLS = BRICKFALL_BALANCE.board.brickfallCols;
const BRICKFALL_TETRIS_OFFSET = BRICKFALL_BALANCE.board.tetrisOffset;

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

type ArchitectSpecialMarker = {
  x: number;
  y: number;
  type: "armored" | "bomb" | "cursed" | "mirror";
};

function BrickfallVersusPvp() {
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [manualMatchId, setManualMatchId] = useState("");
  const [chosenMatchId, setChosenMatchId] = useState<string | undefined>(undefined);
  const [creatorRoleChoice, setCreatorRoleChoice] = useState<"ARCHITECT" | "DEMOLISHER">(
    "ARCHITECT"
  );
  const [creatorRoleForMatch, setCreatorRoleForMatch] = useState<
    "ARCHITECT" | "DEMOLISHER" | undefined
  >(undefined);

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
    results,
    playersInfo,
    opponentFinished,
    error,
    bagSequence,
    garbage,
    actions,
    opponentBoard,
    opponentBrickfallState,
    pendingEvent,
    slot,
    startAt,
  } = useBrickfallVersusSocket({
    matchId: joinId,
    userId: user?.id,
    pseudo: user?.pseudo,
    preferredRole: creatorRoleForMatch,
  });

  const startReady = players >= 2 && bagSequence.length > 0;

  const createMatch = () => {
    setCreatorRoleForMatch(creatorRoleChoice);
    setChosenMatchId(randomMatchId());
  };

  const joinMatch = () => {
    setCreatorRoleForMatch(undefined);
    setChosenMatchId(manualMatchId || undefined);
  };

  const leaveMatch = () => {
    actions.leaveMatch();
    setChosenMatchId(undefined);
    setCreatorRoleForMatch(undefined);
    setInitialArchitectBoard(null);
    setCountdownLabel(null);
    setMatchResolved(false);
    setRoundMessage(null);
    setHoldDisabled(false);
    setArchitectGravityMultiplier(1);
    setDemolisherLives(BRICKFALL_BALANCE.demolisher.startLives);
    setDestroyGarbageQueue(0);
    setDirectGarbage(0);
    setArchitectSpecialMarkers([]);
    lineComboCountRef.current = 0;
    lineClearsRef.current = 0;
    roundFinalizedRef.current = false;
    persistedMatchRef.current = null;
    achievementsFinalizedRef.current = false;
    armoredSpawnCountRef.current = 0;
    chaosEffectsCountRef.current = 0;
    coreDestroyedRef.current = false;
    invertedSeenRef.current = false;
    setBackToBackActive(false);
  };

  const [directGarbage, setDirectGarbage] = useState(0);
  const [, setDestroyGarbageQueue] = useState(0);
  const [externalBoardEdits, setExternalBoardEdits] = useState<Array<{ x: number; y: number }>>([]);
  const [externalBoardEditToken, setExternalBoardEditToken] = useState(0);
  const [architectSpecialMarkers, setArchitectSpecialMarkers] = useState<ArchitectSpecialMarker[]>([]);
  const [initialArchitectBoard, setInitialArchitectBoard] = useState<number[][] | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [matchResolved, setMatchResolved] = useState(false);
  const [roundMessage, setRoundMessage] = useState<string | null>(null);
  const [holdDisabled, setHoldDisabled] = useState(false);
  const [architectGravityMultiplier, setArchitectGravityMultiplier] = useState(1);
  const [demolisherLives, setDemolisherLives] = useState(BRICKFALL_BALANCE.demolisher.startLives);
  const lineComboCountRef = useRef(0);
  const [backToBackActive, setBackToBackActive] = useState(false);
  const lineClearsRef = useRef(0);
  const roundFinalizedRef = useRef(false);
  const persistedMatchRef = useRef<string | null>(null);
  const achievementsFinalizedRef = useRef(false);
  const armoredSpawnCountRef = useRef(0);
  const chaosEffectsCountRef = useRef(0);
  const coreDestroyedRef = useRef(false);
  const invertedSeenRef = useRef(false);

  const isArchitect = slot === 1;
  const isDemolisher = slot === 2;
  const myRole: BrickfallRole | null = isArchitect
    ? "ARCHITECT"
    : isDemolisher
      ? "DEMOLISHER"
      : null;
  const winnerSlot = useMemo(() => {
    if (!results || results.length < 2) return null;
    const best = [...results].sort((a, b) => b.score - a.score)[0];
    if (!best) return null;
    const sameScore = results.filter((r) => r.score === best.score);
    if (sameScore.length > 1) return null;
    return best.slot;
  }, [results]);

  const winnerInfo = useMemo(() => {
    if (!winnerSlot) return null;
    const winnerPlayer = playersInfo.find((p) => p.slot === winnerSlot);
    const winnerRole = winnerSlot === 1 ? "Architecte" : "Démolisseur";
    return {
      pseudo: winnerPlayer?.pseudo ?? `Joueur ${winnerSlot}`,
      role: winnerRole,
    };
  }, [playersInfo, winnerSlot]);
  const boardsPaused = countdownLabel !== null || matchResolved || matchOver || opponentFinished;

  const { state: brickfallState, actions: brickfallActions } = useBrickfallGame({
    onOutgoingEvent: isDemolisher ? (event) => actions.sendBrickfallEvent(event) : undefined,
  });

  const finalizeRound = useCallback(
    (params: {
      winnerRole: BrickfallRole;
      reason: BrickfallWinReason;
      message: string;
      score: number;
      lines: number;
    }) => {
      if (roundFinalizedRef.current) return;
      roundFinalizedRef.current = true;
      setRoundMessage(params.message);
      actions.sendGameOver(params.score, params.lines);
      setMatchResolved(true);
      if (!myRole) return;
      recordBrickfallRound({
        at: Date.now(),
        matchId: currentMatchId,
        playerRole: myRole,
        winnerRole: params.winnerRole,
        reason: params.reason,
        durationMs: startAt ? Math.max(0, Date.now() - startAt) : 0,
        blocksDestroyed: brickfallState.blocksDestroyed,
      });
    },
    [actions, brickfallState.blocksDestroyed, currentMatchId, myRole, startAt]
  );

  useEffect(() => {
    if (!currentMatchId || !isArchitect) return;
    setInitialArchitectBoard(createInitialArchitectBoard(BRICKFALL_ROWS, TETRIS_COLS));
  }, [currentMatchId, isArchitect]);

  useEffect(() => {
    if (!currentMatchId) return;
    persistedMatchRef.current = null;
    setDemolisherLives(BRICKFALL_BALANCE.demolisher.startLives);
    setDestroyGarbageQueue(0);
    setDirectGarbage(0);
    setArchitectSpecialMarkers([]);
    lineClearsRef.current = 0;
    roundFinalizedRef.current = false;
    achievementsFinalizedRef.current = false;
    armoredSpawnCountRef.current = 0;
    chaosEffectsCountRef.current = 0;
    coreDestroyedRef.current = false;
    invertedSeenRef.current = false;
  }, [currentMatchId]);

  useEffect(() => {
    if (!startAt) return;
    lineClearsRef.current = 0;
    roundFinalizedRef.current = false;
    achievementsFinalizedRef.current = false;
    armoredSpawnCountRef.current = 0;
    chaosEffectsCountRef.current = 0;
    coreDestroyedRef.current = false;
    invertedSeenRef.current = false;
  }, [startAt]);

  useEffect(() => {
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, BRICKFALL_VERSUS: true },
    }));
    checkAchievements({
      custom: {
        modes_visited_all: Object.values(next.modesVisited).every(Boolean),
      },
    });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    if (!matchOver || !currentMatchId || !results || results.length !== 2) return;
    if (persistedMatchRef.current === currentMatchId) return;
    const payloadPlayers = results
      .map((r) => {
        const info = playersInfo.find((p) => p.slot === r.slot);
        return {
          slot: r.slot,
          userId: info?.userId,
          pseudo: info?.pseudo ?? `Joueur ${r.slot}`,
          role: (r.slot === 1 ? "ARCHITECT" : "DEMOLISHER") as "ARCHITECT" | "DEMOLISHER",
          score: r.score,
          lines: r.lines,
        };
      })
      .sort((a, b) => a.slot - b.slot);

    persistedMatchRef.current = currentMatchId;
    saveBrickfallVersusMatch({
      matchId: currentMatchId,
      players: payloadPlayers,
    }).catch((err) => {
      console.error("Erreur sauvegarde Brickfall match:", err);
      persistedMatchRef.current = null;
    });
  }, [currentMatchId, matchOver, playersInfo, results]);

  useEffect(() => {
    if (!matchOver || !results || slot === null) return;
    if (achievementsFinalizedRef.current) return;
    const myResult = results.find((r) => r.slot === slot) ?? null;
    const oppResult = results.find((r) => r.slot !== slot) ?? null;
    if (!myResult || !oppResult) return;

    const win = myResult.score > oppResult.score;
    const meRole = slot === 1 ? "ARCHITECT" : "DEMOLISHER";
    const noBallLostWin =
      win &&
      meRole === "DEMOLISHER" &&
      demolisherLives >= BRICKFALL_BALANCE.demolisher.startLives;

    const next = updateStats((prev) => ({
      ...prev,
      brickfallMatches: prev.brickfallMatches + 1,
      brickfallWins: prev.brickfallWins + (win ? 1 : 0),
      brickfallArchitectWins: prev.brickfallArchitectWins + (win && meRole === "ARCHITECT" ? 1 : 0),
      brickfallDemolisherWins:
        prev.brickfallDemolisherWins + (win && meRole === "DEMOLISHER" ? 1 : 0),
      scoredModes: {
        ...prev.scoredModes,
        BRICKFALL_VERSUS: myResult.score > 0 ? true : prev.scoredModes.BRICKFALL_VERSUS,
      },
    }));

    checkAchievements({
      mode: "BRICKFALL_VERSUS",
      score: myResult.score,
      lines: myResult.lines,
      custom: {
        bf_survive_architect: win && meRole === "ARCHITECT",
        bf_armored_10: armoredSpawnCountRef.current >= 10,
        bf_overwhelm: win && meRole === "ARCHITECT",
        bf_blocks_50: meRole === "DEMOLISHER" && myResult.lines >= 50,
        bf_core_destroyed: coreDestroyedRef.current,
        bf_no_ball_lost: noBallLostWin,
        bf_chaos_5: chaosEffectsCountRef.current >= 5,
        bf_win_both_roles:
          next.brickfallArchitectWins >= 1 && next.brickfallDemolisherWins >= 1,
        bf_inverted_win: win && invertedSeenRef.current,
      },
    });

    achievementsFinalizedRef.current = true;
  }, [checkAchievements, demolisherLives, matchOver, results, slot, updateStats]);

  useEffect(() => {
    if (!startReady || !startAt) {
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
  }, [startAt, startReady]);

  useEffect(() => {
    if (!pendingEvent) return;
    if (pendingEvent.type === "destroy_block" && isArchitect) {
      const { x, y } = pendingEvent;
      const remappedX = x - BRICKFALL_TETRIS_OFFSET;
      if (remappedX < 0 || remappedX >= TETRIS_COLS) {
        actions.consumePendingEvent();
        return;
      }
      setExternalBoardEdits((prev) => [...prev, { x: remappedX, y }]);
      setArchitectSpecialMarkers((prev) =>
        prev.filter((marker) => !(marker.x === remappedX && marker.y === y))
      );
      setExternalBoardEditToken((prev) => prev + 1);
      actions.consumePendingEvent();
      return;
    }
    if (pendingEvent.type === "special_spawned" && isArchitect) {
      const cells = Array.isArray(pendingEvent.cells) ? pendingEvent.cells : [];
      const blockType = pendingEvent.blockType as ArchitectSpecialMarker["type"];
      if (!["armored", "bomb", "cursed", "mirror"].includes(blockType)) {
        actions.consumePendingEvent();
        return;
      }
      const mapped = cells
        .map((cell: { x: number; y: number }) => ({
          x: cell.x - BRICKFALL_TETRIS_OFFSET,
          y: cell.y,
          type: blockType,
        }))
        .filter((cell: ArchitectSpecialMarker) => cell.x >= 0 && cell.x < TETRIS_COLS);
      if (mapped.length > 0) {
        setArchitectSpecialMarkers((prev) => {
          const next = [...prev];
          for (const marker of mapped) {
            const idx = next.findIndex((m) => m.x === marker.x && m.y === marker.y);
            if (idx >= 0) next[idx] = marker;
            else next.push(marker);
          }
          return next;
        });
      }
      actions.consumePendingEvent();
      return;
    }
    if (pendingEvent.type === "blocks_destroyed" && isArchitect) {
      setDestroyGarbageQueue((prev) => prev + 1);
      actions.consumePendingEvent();
      return;
    }
    if (pendingEvent.type === "bomb_detonated" && isArchitect) {
      setArchitectGravityMultiplier(1.3);
      setTimeout(() => setArchitectGravityMultiplier(1), 4500);
      chaosEffectsCountRef.current += 1;
      actions.consumePendingEvent();
      return;
    }
    if (pendingEvent.type === "apply_debuff" && isArchitect && pendingEvent.debuff === "hold_off") {
      setHoldDisabled(true);
      setTimeout(() => setHoldDisabled(false), 6000);
      chaosEffectsCountRef.current += 1;
      actions.consumePendingEvent();
      return;
    }
    if (isDemolisher) {
      if (pendingEvent.type === "apply_debuff") {
        chaosEffectsCountRef.current += 1;
        if (pendingEvent.debuff === "invert_controls") {
          invertedSeenRef.current = true;
        }
      }
      brickfallActions.applyIncomingEvent(pendingEvent);
    }
    actions.consumePendingEvent();
  }, [actions, brickfallActions, isArchitect, isDemolisher, pendingEvent]);

  useEffect(() => {
    if (!isArchitect || matchResolved || countdownLabel !== null) return;
    const id = setInterval(() => {
      setDestroyGarbageQueue((prev) => {
        if (prev <= 0) return 0;
        setDirectGarbage((g) =>
          Math.min(g + 1, BRICKFALL_BALANCE.match.maxBufferedGarbage)
        );
        return prev - 1;
      });
    }, BRICKFALL_BALANCE.match.garbageDripIntervalMs);
    return () => clearInterval(id);
  }, [countdownLabel, isArchitect, matchResolved]);

  if (startReady) {
    return (
      <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-6 relative">
        <h1 className="text-3xl text-yellow-400 mb-4 drop-shadow-[0_0_15px_#ff00ff]">
          Brickfall Versus
        </h1>
        <p className="text-sm text-cyan-200 mb-4">
          {user ? `Connecté en tant que ${user.pseudo}` : "Non connecté"}
        </p>

        <div className="flex gap-6 items-start">
          <div className="rounded-xl border border-cyan-500 bg-black/60 p-4 w-[260px]">
            <h2 className="text-cyan-200 mb-2">HUD</h2>
            <div className="text-xs text-left text-cyan-100 space-y-2">
              <div>Match: {currentMatchId ?? "-"}</div>
              <div>Players: {players}</div>
              <div>Role: {isArchitect ? "Architecte" : "Démolisseur"}</div>
              <div>Vitesse balle: x{brickfallState.ballSpeedMultiplier.toFixed(2)}</div>
              <div>Debuff: {brickfallState.debuff ?? "-"}</div>
              <div>Blocs détruits: {brickfallState.blocksDestroyed}</div>
              <div>
                Combo détruits: {brickfallState.pendingGarbageTriggers}/
                {BRICKFALL_BALANCE.interactions.destroyedBlocksPerGarbageTrigger}
              </div>
              {roundMessage && <div>{roundMessage}</div>}
              <div>
                Vies: {isDemolisher ? demolisherLives : (opponentBrickfallState?.lives ?? "-")}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            {isArchitect ? (
              <TetrisBoard
                mode="BRICKFALL_VERSUS"
                scoreMode={null}
                rows={BRICKFALL_ROWS}
                cols={TETRIS_COLS}
                initialBoard={initialArchitectBoard ?? undefined}
                bagSequence={bagSequence}
                autoStart={false}
                paused={boardsPaused}
                incomingGarbage={garbage + directGarbage}
                gravityMultiplier={architectGravityMultiplier}
                disableHold={holdDisabled}
                onGarbageConsumed={() => {
                  actions.consumeGarbage();
                  setDirectGarbage(0);
                }}
                onConsumeLines={(lines) => {
                  if (lines > 0) {
                    lineClearsRef.current += lines;
                    actions.sendLinesCleared(lines);
                    actions.sendBrickfallEvent({ type: "line_clear", lines });
                    const nextCombo = lineComboCountRef.current + 1;
                    lineComboCountRef.current = nextCombo;
                    if (nextCombo >= 3) {
                      chaosEffectsCountRef.current += 1;
                      actions.sendBrickfallEvent({
                        type: "apply_debuff",
                        debuff: "random_gravity",
                      });
                    }
                    if (lines === 4 && backToBackActive) {
                      chaosEffectsCountRef.current += 1;
                      actions.sendBrickfallEvent({ type: "apply_debuff", debuff: "paddle_shrink" });
                    }
                    setBackToBackActive(lines === 4);
                    if (lines === 1) {
                      actions.sendBrickfallEvent({ type: "spawn_block", blockType: "normal" });
                    }
                    if (lines === 2) {
                      armoredSpawnCountRef.current += 1;
                      actions.sendBrickfallEvent({ type: "spawn_block", blockType: "armored" });
                    }
                    if (lines === 4) {
                      actions.sendBrickfallEvent({ type: "spawn_block", blockType: "bomb" });
                    }
                  } else {
                    lineComboCountRef.current = 0;
                    setBackToBackActive(false);
                  }
                }}
                onBoardUpdate={(board) => {
                  setArchitectSpecialMarkers((prev) =>
                    prev.filter((marker) => Boolean(board[marker.y]?.[marker.x]))
                  );
                  actions.sendBoardState(
                    projectArchitectBoardToBrickfall(
                      board,
                      BRICKFALL_COLS,
                      BRICKFALL_TETRIS_OFFSET
                    )
                  );
                }}
                externalBoardEdits={externalBoardEdits}
                externalBoardEditToken={externalBoardEditToken}
                externalSpecialMarkers={architectSpecialMarkers}
                onLocalGameOver={(_, lines) => {
                  if (matchResolved) return;
                  finalizeRound({
                    winnerRole: "DEMOLISHER",
                    reason: "architect_top_out",
                    message: "Pile au sommet: Architecte perd",
                    score: 0,
                    lines,
                  });
                }}
                hideGameOverOverlay
                hideSidebar
              />
            ) : (
              <BrickfallBoard
                rows={BRICKFALL_ROWS}
                cols={BRICKFALL_COLS}
                cellSize={30}
                targetBoard={opponentBoard}
                speedMultiplier={brickfallState.ballSpeedMultiplier}
                debuff={brickfallState.debuff}
                interactive
                canLaunch
                paused={boardsPaused}
                spawnBlockType={
                  brickfallState.lastSpawnedBlock?.type === "spawn_block"
                    ? brickfallState.lastSpawnedBlock.blockType
                    : null
                }
                spawnToken={brickfallState.spawnTick}
                onBlocksDestroyed={(count) => brickfallActions.registerBlocksDestroyed(count)}
                onBlockDestroyedAt={(pos) =>
                  actions.sendBrickfallEvent({ type: "destroy_block", ...pos })
                }
                onLifeDepleted={() => {
                  if (matchResolved) return;
                  finalizeRound({
                    winnerRole: "ARCHITECT",
                    reason: "demolisher_no_lives",
                    message: "Plus de balles: Démolisseur perd",
                    score: 0,
                    lines: brickfallState.blocksDestroyed,
                  });
                }}
                onBombDestroyed={(pos) =>
                  actions.sendBrickfallEvent({ type: "bomb_detonated", radius: 1, ...pos })
                }
                onCursedHit={() =>
                  actions.sendBrickfallEvent({ type: "apply_debuff", debuff: "hold_off" })
                }
                onMirrorHit={() =>
                  {
                    chaosEffectsCountRef.current += 1;
                    invertedSeenRef.current = true;
                    brickfallActions.applyIncomingEvent({
                      type: "apply_debuff",
                      debuff: "invert_controls",
                    });
                  }
                }
                onCoreDestroyed={() => {
                  // Coeur structurel conservé comme élément de gameplay, sans fin de manche.
                  coreDestroyedRef.current = true;
                }}
                onSpecialShapeSpawned={(payload) =>
                  actions.sendBrickfallEvent({ type: "special_spawned", ...payload })
                }
                onState={(state) => actions.sendBrickfallState(state)}
                onLivesChange={setDemolisherLives}
              />
            )}
          </div>
        </div>

        {countdownLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-6xl text-yellow-300 drop-shadow-[0_0_16px_#ff00ff]">
              {countdownLabel}
            </div>
          </div>
        )}

        {(matchOver || opponentLeft) && (
          <FullScreenOverlay show>
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
              {results && slot !== null && (
                <>
                  {(() => {
                    const me = results.find((r) => r.slot === slot) ?? null;
                    const opp = results.find((r) => r.slot !== slot) ?? null;
                    return (
                      <>
                        <p>
                          Toi : {me ? `${me.score} pts / ${me.lines} lignes` : "n/a"}
                        </p>
                        <p>
                          Adversaire : {opp ? `${opp.score} pts / ${opp.lines} lignes` : "n/a"}
                        </p>
                      </>
                    );
                  })()}
                </>
              )}
              {opponentLeft ? (
                <p className="text-yellow-300">Adversaire parti</p>
              ) : winnerInfo ? (
                <>
                  <p className="text-cyan-200">{winnerInfo.pseudo}</p>
                  <p className="text-xs text-pink-200">Rôle: {winnerInfo.role}</p>
                </>
              ) : (
                <p>Match terminé</p>
              )}
              <div className="flex gap-4 mt-2">
                <button className="retro-btn" onClick={leaveMatch}>
                  Retour lobby
                </button>
              </div>
            </div>
          </FullScreenOverlay>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center text-center text-pink-300 font-['Press_Start_2P'] py-10">
      <h1 className="text-3xl text-yellow-400 mb-6 drop-shadow-[0_0_15px_#ff00ff]">
        Mode Brickfall Versus
      </h1>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-5 w-[90%]"
        style={{ maxWidth: "920px" }}
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
            <label className="text-xs text-yellow-300 uppercase tracking-wide">
              Créer / Rejoindre
            </label>

            <input
              className="retro-input w-full"
              placeholder="ID de match (vide pour créer)"
              value={manualMatchId}
              onChange={(e) => setManualMatchId(e.target.value)}
            />

            <select
              value={creatorRoleChoice}
              onChange={(e) =>
                setCreatorRoleChoice(e.target.value as "ARCHITECT" | "DEMOLISHER")
              }
              className="retro-input w-full"
            >
              <option value="ARCHITECT">Créer en Architecte</option>
              <option value="DEMOLISHER">Créer en Démolisseur</option>
            </select>

            <div className="flex gap-3">
              <button className="retro-btn flex-1" onClick={createMatch}>
                Créer un match
              </button>
              <button className="retro-btn flex-1" onClick={joinMatch}>
                Rejoindre
              </button>
            </div>

            {currentMatchId && (
              <button className="retro-btn w-full" onClick={leaveMatch}>
                Quitter le match
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-left text-sm bg-pink-900/20 p-3 rounded-md border border-pink-500/50 mt-4">
            <div>
              <p className="text-gray-300">Statut WS</p>
              <p className={connected ? "text-green-300" : "text-red-400"}>
                {connected ? "connecté" : "connexion..."}
              </p>
            </div>
            <div>
              <p className="text-gray-300">Joueurs</p>
              <p className="text-white">{players}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-300">ID match</p>
              <p className="text-white">{currentMatchId ?? "en attente"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-300">État</p>
              <p className="text-pink-100">
                {error ?? (currentMatchId && !startReady ? "En attente d’un adversaire..." : "Prêt")}
              </p>
            </div>
          </div>
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
          <p className="text-left text-yellow-300 text-xs uppercase tracking-wide">
            Comment jouer
          </p>
          <ul className="text-left text-sm text-gray-200 space-y-2">
            <li>Crée un match vide ou rejoins un ID existant.</li>
            <li>Le créateur choisit son rôle: Architecte ou Démolisseur.</li>
            <li>L’Architecte joue au Tetris et envoie des blocs/débuffs.</li>
            <li>Le Démolisseur casse la structure pour vider les vies adverses.</li>
            <li>Le match démarre dès que 2 joueurs sont connectés.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function BrickfallVersus() {
  const [searchParams] = useSearchParams();
  const queue = (searchParams.get("queue") ?? "pvp").toLowerCase();

  if (queue === "bot") {
    return <BrickfallVersusTetrobots />;
  }

  return <BrickfallVersusPvp />;
}
