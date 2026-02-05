import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../logger";

type Match = {
  id: string;
  mode: "VERSUS" | "ROGUELIKE_VERSUS";
  players: Set<WebSocket>;
  slots: Map<WebSocket, { slot: number; userId?: number; pseudo?: string }>;
  finished: Map<number, { score: number; lines: number }>;
};

type IncomingMessage =
  | { type: "join_match"; matchId?: string; userId?: number; pseudo?: string; mode?: "VERSUS" | "ROGUELIKE_VERSUS" }
  | { type: "lines_cleared"; lines: number }
  | { type: "state"; board: number[][] }
  | { type: "game_over"; score: number; lines: number }
  | { type: "rv_effect"; effect: any }
  | { type: "rv_status"; status: any };

type OutgoingMessage =
  | { type: "match_joined"; matchId: string; players: number; slot: number }
  | { type: "start"; matchId: string; bag: string[]; slot?: number }
  | { type: "bag_refill"; bag: string[] }
  | { type: "garbage"; count: number }
  | { type: "opponent_left" }
  | { type: "opponent_state"; board: number[][] }
  | { type: "opponent_finished" }
  | { type: "match_over"; results: Array<{ slot: number; score: number; lines: number }> }
  | { type: "players_sync"; players: Array<{ slot: number; userId?: number; pseudo?: string }> }
  | { type: "rv_effect"; effect: any }
  | { type: "rv_status"; status: any };

const matches = new Map<string, Match>();
const BAG_REFILL_SIZE = 21; // 3 bags

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

function generateBag(): string[] {
  const pieces = ["I", "O", "T", "S", "Z", "L", "J"];
  const bag = [...pieces];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function generateBags(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(...generateBag());
  }
  return result;
}

function broadcast(match: Match, data: OutgoingMessage, exclude?: WebSocket) {
  const payload = JSON.stringify(data);
  match.players.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastPlayersSync(match: Match) {
  const players = Array.from(match.slots.values()).map((info) => ({
    slot: info.slot,
    userId: info.userId,
    pseudo: info.pseudo,
  }));
  broadcast(match, { type: "players_sync", players });
}

export function setupWebsocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    let currentMatch: Match | null = null;
    let slot = -1;

    ws.on("message", (raw) => {
      let parsed: IncomingMessage;
      try {
        parsed = JSON.parse(raw.toString());
      } catch (err) {
        logger.warn({ err }, "WS message JSON parse error");
        return;
      }

      if (parsed.type === "join_match") {
        const matchId = parsed.matchId || randomId();
        let match = matches.get(matchId);
        if (!match) {
          match = {
            id: matchId,
            mode: parsed.mode ?? "VERSUS",
            players: new Set(),
            slots: new Map(),
            finished: new Map(),
          };
          matches.set(matchId, match);
        }
        match.players.add(ws);
        slot = match.players.size; // simple slot index (1-based)
        match.slots.set(ws, {
          slot,
          userId: parsed.userId,
          pseudo: parsed.pseudo ?? "Anonyme",
        });
        currentMatch = match;
        // payload pour soi (self:true) et pour les autres (sans self)
        const selfPayload = {
          type: "match_joined" as const,
          matchId,
          players: match.players.size,
          slot,
          self: true,
        };
        ws.send(JSON.stringify(selfPayload));
        const otherPayload = {
          type: "match_joined" as const,
          matchId,
          players: match.players.size,
          slot,
        };
        broadcast(match, otherPayload, ws);
        broadcastPlayersSync(match);

        // Démarrer quand 2 joueurs présents
        if (match.players.size >= 2) {
          const bag = generateBags(3); // 3 bags d'avance
          // envoyer le slot à chacun
          match.players.forEach((player) => {
            const playerSlot = match?.slots.get(player)?.slot ?? 0;
            const payload = { type: "start", matchId, bag, slot: playerSlot } as OutgoingMessage & { slot?: number };
            if (player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify(payload));
            }
          });
        }
        return;
      }

      if (!currentMatch) return;

      if (parsed.type === "lines_cleared") {
        const garbageMap = [0, 0, 1, 2, 4]; // single=0, double=1, triple=2, tetris=4
        const garbage =
          currentMatch.mode === "ROGUELIKE_VERSUS"
            ? Math.max(0, parsed.lines)
            : Math.max(0, garbageMap[parsed.lines] ?? 0);
        if (garbage > 0) {
          broadcast(currentMatch, { type: "garbage", count: garbage }, ws);
        }
        // Anti-penurie : on renvoie des bags dès que l'on détecte une consommation possible
        const refill = generateBags(Math.ceil(BAG_REFILL_SIZE / 7));
        broadcast(currentMatch, { type: "bag_refill", bag: refill });
      }

      if (parsed.type === "state") {
        broadcast(currentMatch, { type: "opponent_state", board: parsed.board }, ws);
      }

      if (parsed.type === "rv_effect") {
        broadcast(currentMatch, { type: "rv_effect", effect: parsed.effect }, ws);
      }

      if (parsed.type === "rv_status") {
        broadcast(currentMatch, { type: "rv_status", status: parsed.status }, ws);
      }

      if (parsed.type === "game_over") {
        if (slot > 0) {
          currentMatch.finished.set(slot, {
            score: parsed.score ?? 0,
            lines: parsed.lines ?? 0,
          });
        }
        // informer l'autre joueur que quelqu'un a fini
        broadcast(currentMatch, { type: "opponent_finished" }, ws);
        if (currentMatch.finished.size >= currentMatch.players.size) {
          const results = Array.from(currentMatch.finished.entries()).map(
            ([s, res]) => ({ slot: s, score: res.score, lines: res.lines })
          );
          broadcast(currentMatch, { type: "match_over", results });
        }
      }
    });

    ws.on("close", () => {
      if (currentMatch) {
        currentMatch.players.delete(ws);
        currentMatch.slots.delete(ws);
        broadcast(currentMatch, { type: "opponent_left" }, ws);
        broadcastPlayersSync(currentMatch);
        if (currentMatch.players.size === 0) {
          matches.delete(currentMatch.id);
        }
      }
    });
  });

  logger.info("WebSocket server initialized");
}
