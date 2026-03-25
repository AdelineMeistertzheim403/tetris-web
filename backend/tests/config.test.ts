import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "../src/config";

describe("parseTrustProxy", () => {
  it("desactive trust proxy par defaut hors production", () => {
    expect(parseTrustProxy(undefined, "development")).toBe(false);
  });

  it("active un proxy unique par defaut en production", () => {
    expect(parseTrustProxy(undefined, "production")).toBe(1);
  });

  it("supporte les booleens explicites", () => {
    expect(parseTrustProxy("true", "production")).toBe(true);
    expect(parseTrustProxy("false", "production")).toBe(false);
  });

  it("supporte une profondeur numerique explicite", () => {
    expect(parseTrustProxy("2", "production")).toBe(2);
  });
});
