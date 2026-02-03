import { useCallback, useState } from "react";
import {
  DEFAULT_TIME_FREEZE_DURATION_MS,
  applyTimeFreezeDurationUpdate,
} from "../utils/timeFreeze";

export function useTimeFreezeState() {
  const [timeFreezeCharges, setTimeFreezeCharges] = useState(0);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [timeFreezeDuration, setTimeFreezeDuration] = useState(DEFAULT_TIME_FREEZE_DURATION_MS);
  const [timeFreezeEcho, setTimeFreezeEcho] = useState(false);

  const setTimeFreezeDurationSafe = useCallback(
    (update: number | ((prev: number) => number)) => {
      applyTimeFreezeDurationUpdate(update, setTimeFreezeDuration);
    },
    []
  );

  const resetTimeFreezeState = useCallback(() => {
    setTimeFreezeCharges(0);
    setTimeFrozen(false);
    setTimeFreezeDuration(DEFAULT_TIME_FREEZE_DURATION_MS);
    setTimeFreezeEcho(false);
  }, []);

  return {
    timeFreezeCharges,
    setTimeFreezeCharges,
    timeFrozen,
    setTimeFrozen,
    timeFreezeDuration,
    setTimeFreezeDurationSafe,
    timeFreezeEcho,
    setTimeFreezeEcho,
    resetTimeFreezeState,
  };
}
