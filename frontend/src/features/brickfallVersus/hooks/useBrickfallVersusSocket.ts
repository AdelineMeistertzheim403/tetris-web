// Hook React useBrickfallVersusSocket.ts pour la logique d'etat/effets.
import { useEffect, useMemo, useRef, useState } from "react";

type IncomingMessage =
  | { type: "match_joined"; matchId: string; players: number; slot?: number; self?: boolean }
  | { type: "start"; matchId: string; bag: string[]; slot?: number; startAt?: number }
  | { type: "bag_refill"; bag: string[] }
  | { type: "garbage"; count: number }
  | { type: "opponent_left" }
  | { type: "opponent_finished" }
  | { type: "match_over"; results: Array<{ slot: number; score: number; lines: number }> }
  | { type: "opponent_state"; board: number[][] }
  | { type: "players_sync"; players: Array<{ slot: number; pseudo?: string; userId?: number }> }
  | { type: "bf_event"; event: any }
  | { type: "bf_state"; state: any };

type JoinParams = {
  matchId?: string;
  userId?: number;
  pseudo?: string;
  preferredRole?: "ARCHITECT" | "DEMOLISHER";
};

function buildWsUrl(): string | null {
  const explicitWs = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicitWs) return explicitWs;
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

export function useBrickfallVersusSocket({
  matchId,
  userId,
  pseudo,
  preferredRole,
}: JoinParams) {
  const [connected, setConnected] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [players, setPlayers] = useState(0);
  const [bagSequence, setBagSequence] = useState<string[]>([]);
  const [garbage, setGarbage] = useState(0);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opponentBoard, setOpponentBoard] = useState<number[][] | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [results, setResults] = useState<Array<{ slot: number; score: number; lines: number }> | null>(
    null
  );
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [playersInfo, setPlayersInfo] = useState<Array<{ slot: number; pseudo?: string; userId?: number }>>([]);
  const [pendingEvent, setPendingEvent] = useState<any | null>(null);
  const [opponentBrickfallState, setOpponentBrickfallState] = useState<any | null>(null);
  const [startAt, setStartAt] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const wsUrl = useMemo(buildWsUrl, []);
  const slotRef = useRef<number | null>(null);

  const resetState = () => {
    setConnected(false);
    setCurrentMatchId(null);
    setPlayers(0);
    setBagSequence([]);
    setGarbage(0);
    setOpponentLeft(false);
    setMatchOver(false);
    setError(null);
    setOpponentBoard(null);
    setSlot(null);
    setResults(null);
    setOpponentFinished(false);
    setPlayersInfo([]);
    setPendingEvent(null);
    setOpponentBrickfallState(null);
    setStartAt(null);
    slotRef.current = null;
  };

  useEffect(() => {
    if (!wsUrl) {
      setError("WS URL non configurée (VITE_API_URL manquant)");
      return;
    }
    if (!matchId) {
      setConnected(false);
      return;
    }

    slotRef.current = null;
    setSlot(null);
    setResults(null);
    setOpponentFinished(false);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      ws.send(
        JSON.stringify({
          type: "join_match",
          matchId,
          userId,
          pseudo,
          mode: "BRICKFALL_VERSUS",
          preferredRole,
        })
      );
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
          setBagSequence(msg.bag);
          setStartAt(msg.startAt ?? Date.now());
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
        if (msg.type === "players_sync") {
          setPlayersInfo(msg.players);
        }
        if (msg.type === "bf_event") {
          setPendingEvent(msg.event);
        }
        if (msg.type === "bf_state") {
          setOpponentBrickfallState(msg.state);
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl, matchId, userId, pseudo, preferredRole]);

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

  const sendBrickfallEvent = (event: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "bf_event", event }));
  };

  const sendBrickfallState = (state: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "bf_state", state }));
  };

  const consumeGarbage = () => setGarbage(0);
  const consumePendingEvent = () => setPendingEvent(null);

  return {
    connected,
    currentMatchId,
    players,
    bagSequence,
    garbage,
    opponentBoard,
    opponentFinished,
    opponentLeft,
    matchOver,
    slot,
    results,
    error,
    playersInfo,
    pendingEvent,
    opponentBrickfallState,
    startAt,
    actions: {
      sendLinesCleared,
      sendGameOver,
      consumeGarbage,
      sendBoardState,
      leaveMatch,
      resetState,
      sendBrickfallEvent,
      sendBrickfallState,
      consumePendingEvent,
    },
  };
}
