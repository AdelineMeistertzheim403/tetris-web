import { describe, expect, it } from "vitest";
import {
  applyTetrobotFinaleChoice,
  buildTetrobotAnomalyCounters,
  getTetrobotFinaleState,
  getTetrobotAnomalyCounterKey,
  getTetrobotAnomalyProgress,
  getTetrobotAnomalyStage,
  mergeTetrobotAnomalyArchiveCounters,
  TETROBOT_ANOMALY_CORE_TOTAL,
} from "./tetrobotAnomalies";

describe("tetrobotAnomalies", () => {
  it("archives a pop culture fragment and updates aggregate counters", () => {
    const nextCounters = buildTetrobotAnomalyCounters({}, "yoda-fear");

    expect(nextCounters[getTetrobotAnomalyCounterKey("yoda-fear")]).toBe(1);
    expect(nextCounters.easter_egg_pop).toBe(1);
    expect(nextCounters.all_easter_egg).toBe(1);
  });

  it("does not count the same fragment twice", () => {
    const once = buildTetrobotAnomalyCounters({}, "red-pill");
    const twice = buildTetrobotAnomalyCounters(once, "red-pill");
    const progress = getTetrobotAnomalyProgress(twice);

    expect(progress.coreFound).toBe(1);
    expect(progress.totalFound).toBe(1);
    expect(twice.all_easter_egg).toBe(1);
  });

  it("advances the anomaly stage from dormant to breach using core fragments", () => {
    expect(getTetrobotAnomalyStage(0).id).toBe("dormant");
    expect(getTetrobotAnomalyStage(1).id).toBe("pixel");
    expect(getTetrobotAnomalyStage(5).id).toBe("rookie");
    expect(getTetrobotAnomalyStage(10).id).toBe("pulse");
    expect(getTetrobotAnomalyStage(TETROBOT_ANOMALY_CORE_TOTAL).id).toBe("breach");
  });

  it("stores the final choice and exposes the post-finale state", () => {
    const completedCounters = {
      all_easter_egg: 29,
      easter_egg_pop: 14,
    };
    const nextCounters = applyTetrobotFinaleChoice(completedCounters, "break");
    const finaleState = getTetrobotFinaleState(nextCounters);

    expect(finaleState.choice).toBe("break");
    expect(finaleState.deepLayerUnlocked).toBe(true);
    expect(finaleState.pixelWatching).toBe(true);
    expect(finaleState.canTrigger).toBe(false);
  });

  it("resets archived fragments when the player resets the system", () => {
    const archivedCounters = buildTetrobotAnomalyCounters({}, "red-pill");
    const resetCounters = applyTetrobotFinaleChoice(archivedCounters, "reset");
    const progress = getTetrobotAnomalyProgress(resetCounters);

    expect(progress.totalFound).toBe(0);
    expect(resetCounters.easter_egg_pop).toBe(0);
    expect(resetCounters.all_easter_egg).toBe(0);
    expect(resetCounters.tetrobot_finale_resets).toBe(1);
  });

  it("preserves locally archived fragments when the remote counters are stale", () => {
    const localCounters = buildTetrobotAnomalyCounters({}, "meta_player");
    const mergedCounters = mergeTetrobotAnomalyArchiveCounters(localCounters, {});
    const progress = getTetrobotAnomalyProgress(mergedCounters);

    expect(mergedCounters[getTetrobotAnomalyCounterKey("meta_player")]).toBe(1);
    expect(progress.coreFound).toBe(1);
    expect(progress.totalFound).toBe(1);
  });

  it("does not resurrect fragments after a newer local reset", () => {
    const remoteCounters = buildTetrobotAnomalyCounters({}, "meta_player");
    const localResetCounters = applyTetrobotFinaleChoice(remoteCounters, "reset");
    const mergedCounters = mergeTetrobotAnomalyArchiveCounters(
      localResetCounters,
      remoteCounters
    );
    const progress = getTetrobotAnomalyProgress(mergedCounters);

    expect(progress.totalFound).toBe(0);
    expect(mergedCounters.tetrobot_finale_resets).toBe(1);
  });
});
