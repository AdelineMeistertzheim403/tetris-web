import { useEffect, useMemo, useRef, useState } from "react";

type IncomingMessage =
  | { type: "match_joined"; matchId: string; players: number; slot?: number; self?: boolean }
  | { type: "start"; matchId: string; bag: string[]; slot?: number }
  | { type: "bag_refill"; bag: string[] }
  | { type: "garbage"; count: number }
  | { type: "opponent_left" }
  | { type: "opponent_finished" }
  | { type: "match_over"; results: Array<{ slot: number; score: number; lines: number }> }
  | { type: "opponent_state"; board: number[][] };

type JoinParams = {
  matchId?: string;
};

function buildWsUrl(): string | null {
  const api = import.meta.env.VITE_API_URL;
  if (!api) return null;
  try {
    const url = new URL(api);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    return url.toString();
  } catch {
    return null;
  }
}

export function useVersusSocket({ matchId }: JoinParams) {
  const [connected, setConnected] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [players, setPlayers] = useState(0);
  const [bag, setBag] = useState<string[]>([]);
  const [garbage, setGarbage] = useState(0);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bagSequence, setBagSequence] = useState<string[]>([]);
  const [opponentBoard, setOpponentBoard] = useState<number[][] | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [results, setResults] = useState<Array<{ slot: number; score: number; lines: number }> | null>(null);
  const [opponentFinished, setOpponentFinished] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const wsUrl = useMemo(buildWsUrl, []);
  const slotRef = useRef<number | null>(null);

  const resetState = () => {
    setConnected(false);
    setCurrentMatchId(null);
    setPlayers(0);
    setBag([]);
    setBagSequence([]);
    setGarbage(0);
    setOpponentLeft(false);
    setMatchOver(false);
    setError(null);
    setOpponentBoard(null);
    setSlot(null);
    setResults(null);
    setOpponentFinished(false);
    slotRef.current = null;
  };

  useEffect(() => {
    if (!wsUrl) {
      setError("WS URL non configurée (VITE_API_URL manquant)");
      return;
    }

    // reset slot/results à chaque nouvelle connexion
    slotRef.current = null;
    setSlot(null);
    setResults(null);
    setOpponentFinished(false);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      ws.send(JSON.stringify({ type: "join_match", matchId }));
    };

    ws.onerror = (evt) => {
      console.error("WS error", evt);
      setError("Erreur WebSocket");
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as IncomingMessage;
        if (msg.type === "match_joined") {
          if (msg.self && msg.slot) {
            slotRef.current = msg.slot;
            setSlot(msg.slot);
          }
          setCurrentMatchId(msg.matchId);
          setPlayers(msg.players);
          setOpponentLeft(false);
          setMatchOver(false);
          setResults(null);
          setOpponentFinished(false);
        }
        if (msg.type === "start") {
          if (msg.slot && slotRef.current === null) {
            slotRef.current = msg.slot;
            setSlot(msg.slot);
          }
          setBag(msg.bag);
          setBagSequence(msg.bag);
        }
        if (msg.type === "bag_refill") {
          setBagSequence(msg.bag);
        }
        if (msg.type === "garbage") {
          setGarbage((g) => g + msg.count);
        }
        if (msg.type === "opponent_left") {
          setOpponentLeft(true);
        }
        if (msg.type === "match_over") {
          setMatchOver(true);
          setResults(msg.results ?? null);
        }
        if (msg.type === "opponent_finished") {
          setOpponentFinished(true);
        }
        if (msg.type === "opponent_state") {
          setOpponentBoard(msg.board);
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl, matchId]);

  const leaveMatch = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    resetState();
  };

  const sendLinesCleared = (lines: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "lines_cleared", lines }));
  };

  const sendGameOver = (score: number, lines: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "game_over", score, lines }));
  };

  const sendBoardState = (board: number[][]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "state", board }));
  };

  const consumeGarbage = () => setGarbage(0);

  return {
    connected,
    currentMatchId,
    players,
    bag,
    bagSequence,
    garbage,
    opponentBoard,
    opponentFinished,
    opponentLeft,
    matchOver,
    slot,
    results,
    error,
    actions: {
      sendLinesCleared,
      sendGameOver,
      consumeGarbage,
      sendBoardState,
      leaveMatch,
      resetState,
    },
  };
}
