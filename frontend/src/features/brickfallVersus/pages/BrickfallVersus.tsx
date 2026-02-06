import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import FullScreenOverlay from "../../../shared/components/ui/overlays/FullScreenOverlay";
import { useBrickfallVersusSocket } from "../hooks/useBrickfallVersusSocket";
import { useBrickfallGame } from "../hooks/useBrickfallGame";
import BrickfallBoard from "../components/BrickfallBoard";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

const BRICKFALL_ROWS = 22;
const BRICKFALL_COLS = 24;

export default function BrickfallVersus() {
  const { user } = useAuth();
  const [manualMatchId, setManualMatchId] = useState("");
  const [chosenMatchId, setChosenMatchId] = useState<string | undefined>(undefined);

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
    pendingEvent,
    opponentBrickfallState,
    slot,
  } = useBrickfallVersusSocket({ matchId: joinId, userId: user?.id, pseudo: user?.pseudo });

  const startReady = players >= 2 && bagSequence.length > 0;

  const [localBoard, setLocalBoard] = useState<number[][] | null>(null);
  const [directGarbage, setDirectGarbage] = useState(0);
  const [architectPiecesPlaced, setArchitectPiecesPlaced] = useState(0);
  const [externalBoardEdits, setExternalBoardEdits] = useState<Array<{ x: number; y: number }>>([]);
  const [externalBoardEditToken, setExternalBoardEditToken] = useState(0);

  const isArchitect = slot === 1;
  const isDemolisher = slot === 2;

  const { state: brickfallState, actions: brickfallActions } = useBrickfallGame({
    onState: isDemolisher ? (state) => actions.sendBrickfallState(state) : undefined,
    onOutgoingEvent: isDemolisher ? (event) => actions.sendBrickfallEvent(event) : undefined,
  });

  useEffect(() => {
    if (!pendingEvent) return;
    if (pendingEvent.type === "destroy_block" && isArchitect) {
      const { x, y } = pendingEvent;
      setExternalBoardEdits((prev) => [...prev, { x, y }]);
      setExternalBoardEditToken((prev) => prev + 1);
      actions.consumePendingEvent();
      return;
    }
    if (pendingEvent.type === "blocks_destroyed" && isArchitect) {
      setDirectGarbage((prev) => prev + 1);
      actions.consumePendingEvent();
      return;
    }
    if (isDemolisher) {
      brickfallActions.applyIncomingEvent(pendingEvent);
    }
    actions.consumePendingEvent();
  }, [actions, brickfallActions, isArchitect, isDemolisher, pendingEvent]);

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
              <div>Combo détruits: {brickfallState.pendingGarbageTriggers}/5</div>
              <div>Pièces archi: {brickfallState.architectPiecesPlaced}</div>
              <div>Vies: {brickfallState.lives}</div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            {isArchitect ? (
              <TetrisBoard
                mode="BRICKFALL_VERSUS"
                scoreMode={null}
                rows={BRICKFALL_ROWS}
                cols={BRICKFALL_COLS}
                bagSequence={bagSequence}
                incomingGarbage={garbage + directGarbage}
                onGarbageConsumed={() => {
                  actions.consumeGarbage();
                  setDirectGarbage(0);
                }}
                onConsumeLines={(lines) => {
                  if (lines > 0) {
                    actions.sendLinesCleared(lines);
                    actions.sendBrickfallEvent({ type: "line_clear", lines });
                    if (lines === 2) {
                      actions.sendBrickfallEvent({ type: "spawn_block", blockType: "armored" });
                    }
                    if (lines === 4) {
                      actions.sendBrickfallEvent({ type: "spawn_block", blockType: "bomb" });
                    }
                  }
                }}
                onBoardUpdate={(board) => {
                  setLocalBoard(board);
                  actions.sendBoardState(board);
                }}
                externalBoardEdits={externalBoardEdits}
                externalBoardEditToken={externalBoardEditToken}
                onPieceLocked={() => {
                  setArchitectPiecesPlaced((prev) => {
                    const next = prev + 1;
                    actions.sendBrickfallEvent({ type: "pieces_placed", count: next });
                    return next;
                  });
                }}
                onLocalGameOver={(score, lines) => actions.sendGameOver(score, lines)}
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
                canLaunch={brickfallState.architectPiecesPlaced >= 12}
                onBlocksDestroyed={(count) => brickfallActions.registerBlocksDestroyed(count)}
                onBlockDestroyedAt={(pos) =>
                  actions.sendBrickfallEvent({ type: "destroy_block", ...pos })
                }
                onState={(state) => actions.sendBrickfallState(state)}
              />
            )}
          </div>
        </div>

        {(matchOver || opponentLeft) && (
          <FullScreenOverlay onClose={() => actions.leaveMatch()}>
            <div className="text-center text-yellow-300 font-['Press_Start_2P']">
              <h2 className="text-2xl mb-4">Match terminé</h2>
              <p>{opponentLeft ? "Adversaire parti" : "Match terminé"}</p>
              <button
                className="mt-6 px-4 py-2 rounded bg-pink-700 hover:bg-pink-600"
                onClick={() => actions.leaveMatch()}
              >
                Quitter
              </button>
            </div>
          </FullScreenOverlay>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center text-pink-300 font-['Press_Start_2P']">
      <h1 className="text-3xl text-yellow-400 mb-6">Brickfall Versus</h1>
      <p className="text-sm text-cyan-200 mb-6">
        {connected ? "Connecté" : "Connexion..."} — {error ?? "Prêt"}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {currentMatchId && !startReady && (
          <div className="rounded-xl border border-pink-500 bg-black/60 p-4 text-left text-xs text-pink-100 space-y-2">
            <div>Match: {currentMatchId}</div>
            <div>Players: {players}</div>
            <div>Status: {connected ? "connecté" : "connexion..."}</div>
            <div>En attente d’un adversaire...</div>
          </div>
        )}
        <input
          className="px-4 py-3 rounded bg-black/60 border border-pink-500 text-pink-200"
          placeholder="ID de match"
          value={manualMatchId}
          onChange={(e) => setManualMatchId(e.target.value)}
        />
        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-3 rounded bg-pink-700 hover:bg-pink-600"
            onClick={() => setChosenMatchId(randomMatchId())}
          >
            Créer un match
          </button>
          <button
            className="flex-1 px-4 py-3 rounded bg-cyan-700 hover:bg-cyan-600"
            onClick={() => setChosenMatchId(manualMatchId || undefined)}
          >
            Rejoindre
          </button>
        </div>
        {currentMatchId && (
          <button
            className="px-4 py-3 rounded bg-pink-900/70 hover:bg-pink-800"
            onClick={() => actions.leaveMatch()}
          >
            Quitter le match
          </button>
        )}
      </div>
    </div>
  );
}
