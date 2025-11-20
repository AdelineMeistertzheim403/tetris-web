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

  it("enregistre un score authentifie", async () => {
    const res = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: 1500, level: 5, lines: 20, mode: "CLASSIQUE" });

    expect(res.status).toBe(201);
    expect(res.body.score.value).toBe(1500);
  });
});
