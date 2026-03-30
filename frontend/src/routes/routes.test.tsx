import { describe, expect, it } from "vitest";
import { matchPath } from "react-router-dom";
import { coreRouteSpecs } from "./coreRoutes";
import { gameRouteSpecs } from "./gameRoutes";
import { PATHS } from "./paths";
import { tetroVerseRouteSpecs } from "./tetroVerseRoutes";

const allRouteSpecs = [...coreRouteSpecs, ...gameRouteSpecs, ...tetroVerseRouteSpecs];

describe("route paths", () => {
  it("uses unique paths for concrete routes", () => {
    const concretePaths = allRouteSpecs
      .map((route) => route.path)
      .filter((path) => path !== PATHS.notFound);

    expect(new Set(concretePaths).size).toBe(concretePaths.length);
  });

  it("matches representative application URLs", () => {
    expect(matchPath(PATHS.home, "/")).toBeTruthy();
    expect(matchPath(PATHS.dashboard, "/dashboard")).toBeTruthy();
    expect(matchPath(PATHS.dashboardEditor, "/dashboard/editor")).toBeTruthy();
    expect(matchPath(PATHS.puzzleRun, "/puzzle/42")).toBeTruthy();
    expect(matchPath(PATHS.pixelProtocolCommunityLevel, "/pixel-protocol/community/demo")).toBeTruthy();
  });

  it("marks sensitive routes as protected", () => {
    const protectedPaths = new Map(
      allRouteSpecs
        .filter((route) => route.requiresAuth)
        .map((route) => [route.path, true])
    );

    expect(protectedPaths.get(PATHS.dashboard)).toBe(true);
    expect(protectedPaths.get(PATHS.dashboardEditor)).toBe(true);
    expect(protectedPaths.get(PATHS.achievements)).toBe(true);
    expect(protectedPaths.get(PATHS.settings)).toBe(true);
    expect(protectedPaths.get(PATHS.tetrobotsRelations)).toBe(true);
    expect(protectedPaths.get(PATHS.brickfallEditor)).toBe(true);
    expect(protectedPaths.get(PATHS.tetromazeEditor)).toBe(true);
    expect(protectedPaths.get(PATHS.pixelProtocolEditor)).toBe(true);
  });
});
