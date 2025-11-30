import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useVersusSocket } from "../hooks/useVersusSocket";
import TetrisBoard from "../components/TetrisBoard";
import OpponentBoard from "../components/OpponentBoard";
import FullScreenOverlay from "../components/FullScreenOverlay";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function Versus() {
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
    slot,
    results,
  } = useVersusSocket({ matchId: joinId });

  const startReady = players >= 2 && bagSequence.length > 0;
  const [localFinished, setLocalFinished] = useState(false);

  if (startReady) {
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
            bagSequence={bagSequence}
            incomingGarbage={garbage}
            onGarbageConsumed={actions.consumeGarbage}
            onConsumeLines={(lines) => actions.sendLinesCleared(lines)}
            onBoardUpdate={(board) => actions.sendBoardState(board)}
            onLocalGameOver={(score, lines) => {
              setLocalFinished(true);
              actions.sendGameOver(score, lines);
            }}
            hideGameOverOverlay
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
