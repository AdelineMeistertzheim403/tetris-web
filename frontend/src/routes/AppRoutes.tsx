import { Routes } from "react-router-dom";
import { coreRoutes } from "./coreRoutes";
import { gameRoutes } from "./gameRoutes";
import { tetroVerseRoutes } from "./tetroVerseRoutes";

export function AppRoutes() {
  return (
    <Routes>
      {coreRoutes}
      {gameRoutes}
      {tetroVerseRoutes}
    </Routes>
  );
}
