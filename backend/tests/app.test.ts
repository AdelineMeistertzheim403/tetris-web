import request from "supertest";
import { describe, expect, it, beforeAll, vi } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const hashedPassword = bcrypt.hashSync("password123", 10);
const mockUser = {
  id: 1,
  pseudo: "neo",
  email: "neo@tetris.com",
  password: hashedPassword,
  createdAt: new Date(),
};

const mockScores = [
  { id: 1, value: 1200, level: 3, lines: 15, userId: 1, mode: "CLASSIQUE", createdAt: new Date(), user: { pseudo: "neo" } },
  { id: 2, value: 800, level: 2, lines: 10, userId: 2, mode: "CLASSIQUE", createdAt: new Date(), user: { pseudo: "trinity" } },
];

const mockVersusScores = [
  { id: 3, value: 1500, level: 1, lines: 20, userId: 1, mode: "VERSUS", createdAt: new Date(), user: { pseudo: "neo" } },
];

const mockVersusMatches = [
  {
    id: 10,
    matchId: "abc123",
    player1Id: 1,
    player1Pseudo: "neo",
    player1Score: 1500,
    player1Lines: 20,
    player2Id: 2,
    player2Pseudo: "trinity",
    player2Score: 900,
    player2Lines: 15,
    winnerId: 1,
    winnerPseudo: "neo",
    createdAt: new Date(),
  },
];

// Mock Prisma client
vi.mock("../src/prisma/client", () => {
  const userFindUnique = vi.fn(({ where }) =>
    where.email === mockUser.email ? mockUser : null
  );

  const scoreCreate = vi.fn(({ data }) => ({
    id: 99,
    createdAt: new Date(),
    ...data,
  }));

  const scoreFindMany = vi.fn(({ where }) => {
    if (where?.mode === "CLASSIQUE") return mockScores;
    if (where?.mode === "VERSUS") return mockVersusScores;
    return [];
  });

  const versusMatchCreate = vi.fn(({ data }) => ({
    id: 77,
    createdAt: new Date(),
    ...data,
  }));

  const versusMatchFindMany = vi.fn(() => mockVersusMatches);

  const queryRaw = vi.fn(async (strings: TemplateStringsArray) => {
    const sql = strings[0] || "";
    if (sql.includes("winnerId")) {
      return [{ userId: 1, wins: 3 }];
    }
    if (sql.includes("loserId")) {
      return [{ userId: 2, losses: 2 }];
    }
    return [];
  });

  return {
    default: {
      user: {
        findUnique: userFindUnique,
      },
      score: {
        create: scoreCreate,
        findMany: scoreFindMany,
      },
      versusMatch: {
        create: versusMatchCreate,
        findMany: versusMatchFindMany,
      },
      $queryRaw: queryRaw,
    },
  };
});

let app: import("express").Express;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "super_secret_tetris_key_dev";
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://stub";
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:5173";
  process.env.PORT = process.env.PORT || "0";
  app = (await import("../src/app")).default;
});

describe("Auth routes", () => {
  it("login retourne un token et le user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: mockUser.email, password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(mockUser.email);
  });

  it("login refuse un mauvais mot de passe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: mockUser.email, password: "wrong" });

    expect(res.status).toBe(400);
  });
});

describe("Scores routes", () => {
  const token = jwt.sign(
    { id: mockUser.id, email: mockUser.email, pseudo: mockUser.pseudo },
    process.env.JWT_SECRET || "super_secret_tetris_key_dev"
  );

  it("leaderboard renvoie des scores", async () => {
    const res = await request(app).get("/api/scores/leaderboard/CLASSIQUE");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("value");
  });

  it("leaderboard supporte le mode VERSUS", async () => {
    const res = await request(app).get("/api/scores/leaderboard/VERSUS");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("player1");
    expect(res.body[0]).toHaveProperty("player2");
  });

  it("enregistre un score authentifie", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: 1500, level: 5, lines: 20, mode: "CLASSIQUE" });

    expect(res.status).toBe(201);
    expect(res.body.score.value).toBe(1500);
  });

  it("enregistre un score VERSUS authentifie", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: 900, level: 1, lines: 12, mode: "VERSUS" });

    expect(res.status).toBe(201);
    expect(res.body.score.mode).toBe("VERSUS");
  });

  it("enregistre un match VERSUS en une ligne", async () => {
    const res = await request(app)
      .post("/api/scores/versus-match")
      .set("Authorization", `Bearer ${token}`)
      .send({
        matchId: "abc123",
        players: [
          { slot: 1, userId: 1, pseudo: "neo", score: 1500, lines: 20 },
          { slot: 2, userId: 2, pseudo: "trinity", score: 900, lines: 15 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.player1Pseudo).toBe("neo");
    expect(res.body.winnerId).toBe(1);
  });
});
