import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { defaultTetromazeLevel } from "../data/defaultLevel";
import type { TetromazeLevel, TetromazeOrbType } from "../types";
import {
  exportTetromazeLevelJson,
  listTetromazeCustomLevels,
  parseTetromazeLevelsFromJson,
  removeTetromazeCustomLevel,
  upsertTetromazeCustomLevel,
} from "../utils/customLevels";
import "../../../styles/tetromaze-editor.css";

type Tool = "tetromino" | "erase" | "player" | "powerup" | "home" | "loop";
type Tetromino = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type LoopEndpoint = "a" | "b";

type Pos = { x: number; y: number };
const CELL_SIZE = 40;
const MAX_BOTS_PER_KIND = 30;

const TOOLBAR_ITEMS: Array<{ tool: Tool; label: string; icon: string }> = [
  { tool: "tetromino", label: "Tetromino murs", icon: "/Tetromaze-Editor/tetromino_murs.png" },
  { tool: "erase", label: "Gomme sol", icon: "/Tetromaze-Editor/gomme_sol.png" },
  { tool: "player", label: "Spawn joueur", icon: "/Tetromaze-Editor/spawn_joueur.png" },
  { tool: "powerup", label: "Power-up", icon: "/Tetromaze-Editor/power-up.png" },
  { tool: "home", label: "Maison tetrobots", icon: "/Tetromaze-Editor/maison_tetrobots.png" },
  { tool: "loop", label: "Teleporteur", icon: "/Tetromaze-Editor/teleporteur.png" },
];

const POWERUPS: TetromazeOrbType[] = [
  "OVERCLOCK",
  "GLITCH",
  "HACK",
  "LOOP",
  "FREEZE_PROTOCOL",
  "MAGNET_FIELD",
  "FIREWALL",
  "GHOST_MODE",
  "DESYNC",
  "MIRROR_SIGNAL",
  "PULSE_WAVE",
  "OVERHEAT",
  "NEURAL_LAG",
  "RANDOMIZER",
  "CORRUPTION",
  "SCAN",
  "VIRUS",
];

const PIECE_BASE: Record<Tetromino, Pos[]> = {
  I: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  O: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  T: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  S: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
  Z: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  J: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }],
  L: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
};

const DEFAULT_BOT_HOME = defaultTetromazeLevel.botHome ?? {
  x: 7,
  y: 2,
  width: 5,
  height: 4,
  gate: { x: 8, y: 5, width: 3 },
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function rotate(point: Pos, turns: number): Pos {
  let out = { ...point };
  for (let i = 0; i < turns; i += 1) {
    out = { x: -out.y, y: out.x };
  }
  return out;
}

function botSpawnsFromHome(home: TetromazeLevel["botHome"], count: number): Pos[] {
  if (!home) return [];
  const slots: Pos[] = [];
  for (let y = home.y + 1; y < home.y + home.height; y += 1) {
    for (let x = home.x + 1; x < home.x + home.width - 1; x += 1) {
      slots.push({ x, y });
    }
  }
  if (!slots.length) slots.push({ x: home.x + 1, y: home.y + 1 });
  return Array.from({ length: count }, (_, i) => slots[i % slots.length]);
}

function makeEmptyGrid(): string[] {
  const h = defaultTetromazeLevel.grid.length;
  const w = defaultTetromazeLevel.grid[0].length;
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? "#" : ".")).join("")
  );
}

function makeNewLevel(): TetromazeLevel {
  const grid = makeEmptyGrid();
  const botHome = { ...DEFAULT_BOT_HOME };
  const botKinds: TetromazeLevel["botKinds"] = ["rookie", "balanced", "apex"];
  return {
    id: `tmz-custom-${Date.now().toString(36)}`,
    name: "Tetromaze custom",
    grid,
    playerSpawn: { x: Math.floor(grid[0].length / 2), y: grid.length - 2 },
    botKinds,
    botHome,
    botSpawns: botSpawnsFromHome(botHome, botKinds.length),
    powerOrbs: [],
    loopPairs: [],
  };
}

function enforceBorders(grid: string[]): string[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  return grid.map((row, y) =>
    row
      .split("")
      .map((cell, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? "#" : cell === "#" ? "#" : "."))
      .join("")
  );
}

export default function TetromazeEditor() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [levels, setLevels] = useState<TetromazeLevel[]>(() => listTetromazeCustomLevels());
  const [active, setActive] = useState<TetromazeLevel>(makeNewLevel());
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("tetromino");
  const [piece, setPiece] = useState<Tetromino>("T");
  const [rotation, setRotation] = useState(0);
  const [powerup, setPowerup] = useState<TetromazeOrbType>("HACK");
  const [loopIndex, setLoopIndex] = useState(0);
  const [loopEndpoint, setLoopEndpoint] = useState<LoopEndpoint>("a");
  const [hoverCell, setHoverCell] = useState<Pos | null>(null);
  const [rookieCount, setRookieCount] = useState(1);
  const [balancedCount, setBalancedCount] = useState(1);
  const [apexCount, setApexCount] = useState(1);

  const width = active.grid[0].length;
  const height = active.grid.length;

  const powerOrbMap = useMemo(() => {
    const map = new Map<string, TetromazeOrbType>();
    for (const orb of active.powerOrbs) map.set(`${orb.x}:${orb.y}`, orb.type);
    return map;
  }, [active.powerOrbs]);

  const loopMap = useMemo(() => {
    const map = new Map<string, string>();
    (active.loopPairs ?? []).forEach((pair, idx) => {
      map.set(`${pair.a.x}:${pair.a.y}`, `L${idx + 1}A`);
      map.set(`${pair.b.x}:${pair.b.y}`, `L${idx + 1}B`);
    });
    return map;
  }, [active.loopPairs]);

  const previewKeys = useMemo(() => {
    if (!hoverCell) return new Set<string>();
    const out = new Set<string>();
    const { x, y } = hoverCell;

    const add = (px: number, py: number) => {
      if (px < 0 || py < 0 || px >= width || py >= height) return;
      out.add(`${px}:${py}`);
    };

    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) {
      if (tool !== "home") return out;
    }

    if (tool === "tetromino") {
      const blocks = PIECE_BASE[piece].map((p) => rotate(p, rotation));
      for (const b of blocks) {
        const nx = x + b.x;
        const ny = y + b.y;
        if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
        add(nx, ny);
      }
      return out;
    }

    if (tool === "home") {
      const hx = clamp(x, 1, width - 6);
      const hy = clamp(y, 1, height - 5);
      for (let yy = hy; yy < hy + 4; yy += 1) {
        for (let xx = hx; xx < hx + 5; xx += 1) add(xx, yy);
      }
      return out;
    }

    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return out;
    add(x, y);
    return out;
  }, [height, hoverCell, piece, rotation, tool, width]);

  const botKinds = useMemo(() => {
    const kinds: TetromazeLevel["botKinds"] = [];
    for (let i = 0; i < rookieCount; i += 1) kinds.push("rookie");
    for (let i = 0; i < balancedCount; i += 1) kinds.push("balanced");
    for (let i = 0; i < apexCount; i += 1) kinds.push("apex");
    return kinds;
  }, [apexCount, balancedCount, rookieCount]);

  const applyKinds = () => {
    setActive((prev) => {
      const nextHome = prev.botHome ?? DEFAULT_BOT_HOME;
      return {
        ...prev,
        botKinds,
        botSpawns: botSpawnsFromHome(nextHome, botKinds.length),
      };
    });
  };

  const updateGrid = (mutator: (rows: string[][]) => void) => {
    setActive((prev) => {
      const rows = prev.grid.map((row) => row.split(""));
      mutator(rows);
      return {
        ...prev,
        grid: enforceBorders(rows.map((r) => r.join(""))),
      };
    });
  };

  const onCellClick = (x: number, y: number) => {
    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return;

    if (tool === "tetromino") {
      updateGrid((rows) => {
        const blocks = PIECE_BASE[piece].map((p) => rotate(p, rotation));
        for (const b of blocks) {
          const nx = x + b.x;
          const ny = y + b.y;
          if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
          rows[ny][nx] = "#";
        }
      });
      return;
    }

    if (tool === "erase") {
      updateGrid((rows) => {
        rows[y][x] = ".";
      });
      return;
    }

    if (tool === "player") {
      setActive((prev) => ({ ...prev, playerSpawn: { x, y } }));
      return;
    }

    if (tool === "home") {
      setActive((prev) => {
        const w = prev.grid[0].length;
        const h = prev.grid.length;
        const hx = clamp(x, 1, w - 6);
        const hy = clamp(y, 1, h - 5);
        const botHome = {
          x: hx,
          y: hy,
          width: 5,
          height: 4,
          gate: { x: hx + 1, y: hy + 3, width: 3 },
        };
        return {
          ...prev,
          botHome,
          botSpawns: botSpawnsFromHome(
            botHome,
            (prev.botKinds ?? ["rookie", "balanced", "apex"]).length
          ),
        };
      });
      return;
    }

    if (tool === "powerup") {
      setActive((prev) => {
        const existing = prev.powerOrbs.find((orb) => orb.x === x && orb.y === y);
        const others = prev.powerOrbs.filter((orb) => !(orb.x === x && orb.y === y));
        if (!existing || existing.type !== powerup) {
          others.push({ x, y, type: powerup });
        }
        return { ...prev, powerOrbs: others };
      });
      return;
    }

    if (tool === "loop") {
      setActive((prev) => {
        const pairs = [...(prev.loopPairs ?? [])];
        while (pairs.length <= loopIndex) {
          pairs.push({ a: { x: 1, y: 1 }, b: { x: width - 2, y: height - 2 } });
        }
        const target = pairs[loopIndex];
        if (loopEndpoint === "a") target.a = { x, y };
        else target.b = { x, y };
        return { ...prev, loopPairs: pairs };
      });
    }
  };

  const saveLevel = () => {
    const levelToSave: TetromazeLevel = {
      ...active,
      botKinds,
      botSpawns: botSpawnsFromHome(active.botHome ?? DEFAULT_BOT_HOME, botKinds.length),
    };
    const next = upsertTetromazeCustomLevel(levelToSave);
    setLevels(next);
    setActive(levelToSave);
    setError(null);
  };

  const loadLevel = (level: TetromazeLevel) => {
    setActive(level);
    const kinds = level.botKinds ?? ["rookie", "balanced", "apex"];
    setRookieCount(kinds.filter((k) => k === "rookie").length);
    setBalancedCount(kinds.filter((k) => k === "balanced").length);
    setApexCount(kinds.filter((k) => k === "apex").length);
  };

  const removeLevel = (id: string) => {
    const next = removeTetromazeCustomLevel(id);
    setLevels(next);
    if (active.id === id) setActive(next[0] ?? makeNewLevel());
  };

  const onImportFile = async (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseTetromazeLevelsFromJson(text);
      if (!imported.length) {
        setError("JSON invalide");
        return;
      }
      let next = listTetromazeCustomLevels();
      for (const lvl of imported) {
        next = upsertTetromazeCustomLevel(lvl);
      }
      setLevels(next);
      setActive(imported[0]);
      setError(null);
    } catch {
      setError("Import impossible");
    }
  };

  const exportActive = () => {
    const blob = new Blob([exportTetromazeLevelJson(active)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tetromaze-editor font-['Press_Start_2P']">
      <div className="tetromaze-editor-shell">
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />

        <div className="tetromaze-editor-columns">
          <div className="panel tetromaze-editor-side">
            <div className="tetromaze-editor-stack">
              <label>ID</label>
              <input value={active.id} onChange={(e) => setActive((p) => ({ ...p, id: e.target.value }))} />
              <label>Nom</label>
              <input value={active.name ?? ""} onChange={(e) => setActive((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="tetromaze-editor-stack tetromaze-editor-divider">
              {tool === "tetromino" && (
                <>
                  <label>Piece</label>
                  <select value={piece} onChange={(e) => setPiece(e.target.value as Tetromino)}>
                    {["I", "O", "T", "S", "Z", "J", "L"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <label>Rotation</label>
                  <select value={rotation} onChange={(e) => setRotation(Number.parseInt(e.target.value, 10) || 0)}>
                    <option value={0}>0°</option>
                    <option value={1}>90°</option>
                    <option value={2}>180°</option>
                    <option value={3}>270°</option>
                  </select>
                </>
              )}

              {tool === "powerup" && (
                <>
                  <label>Power-up</label>
                  <select value={powerup} onChange={(e) => setPowerup(e.target.value as TetromazeOrbType)}>
                    {POWERUPS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </>
              )}

              {tool === "loop" && (
                <>
                  <label>Paire teleporter</label>
                  <select value={loopIndex} onChange={(e) => setLoopIndex(Number.parseInt(e.target.value, 10) || 0)}>
                    <option value={0}>Pair 1</option>
                    <option value={1}>Pair 2</option>
                    <option value={2}>Pair 3</option>
                  </select>
                  <label>Extremite</label>
                  <select value={loopEndpoint} onChange={(e) => setLoopEndpoint(e.target.value as LoopEndpoint)}>
                    <option value="a">A</option>
                    <option value="b">B</option>
                  </select>
                </>
              )}
            </div>

            <div className="tetromaze-editor-stack tetromaze-editor-divider">
              <label>Tetrobots (rookie / pulse / apex)</label>
              <div className="tetromaze-editor-bot-row">
                <span>Rookie</span>
                <input
                  type="number"
                  min={0}
                  max={MAX_BOTS_PER_KIND}
                  value={rookieCount}
                  onChange={(e) =>
                    setRookieCount(clamp(Number(e.target.value) || 0, 0, MAX_BOTS_PER_KIND))
                  }
                />
              </div>
              <div className="tetromaze-editor-bot-row">
                <span>Pulse</span>
                <input
                  type="number"
                  min={0}
                  max={MAX_BOTS_PER_KIND}
                  value={balancedCount}
                  onChange={(e) =>
                    setBalancedCount(clamp(Number(e.target.value) || 0, 0, MAX_BOTS_PER_KIND))
                  }
                />
              </div>
              <div className="tetromaze-editor-bot-row">
                <span>Apex</span>
                <input
                  type="number"
                  min={0}
                  max={MAX_BOTS_PER_KIND}
                  value={apexCount}
                  onChange={(e) =>
                    setApexCount(clamp(Number(e.target.value) || 0, 0, MAX_BOTS_PER_KIND))
                  }
                />
              </div>
              <button className="retro-btn" onClick={applyKinds}>Appliquer tetrobots</button>
            </div>

            <div className="tetromaze-editor-stack tetromaze-editor-divider">
              <button className="retro-btn" onClick={saveLevel}>Sauver</button>
              <button className="retro-btn" onClick={() => setActive(makeNewLevel())}>Nouveau</button>
              <button className="retro-btn" onClick={exportActive}>Export JSON</button>
              <button className="retro-btn" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
              <button className="retro-btn" onClick={() => navigate(`/tetromaze/play?custom=${encodeURIComponent(active.id)}`)}>Jouer ce niveau</button>
              {error && <div className="tetromaze-editor-error">{error}</div>}
            </div>
          </div>

          <div className="panel tetromaze-editor-grid-card">
            <div className="tetromaze-editor-toolbar">
              {TOOLBAR_ITEMS.map((item) => (
                <button
                  key={item.tool}
                  type="button"
                  className={`tetromaze-editor-toolbtn ${tool === item.tool ? "is-active" : ""}`}
                  onClick={() => setTool(item.tool)}
                  title={item.label}
                  aria-label={item.label}
                >
                  <img src={item.icon} alt={item.label} />
                </button>
              ))}
            </div>
            <div
              className="tetromaze-editor-grid"
              style={{ gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)` }}
            >
              {Array.from({ length: width * height }, (_, idx) => {
                const x = idx % width;
                const y = Math.floor(idx / width);
                const cell = active.grid[y][x];
                const isPreview = previewKeys.has(`${x}:${y}`);
                const orb = powerOrbMap.get(`${x}:${y}`);
                const loopTag = loopMap.get(`${x}:${y}`);
                const isPlayer = active.playerSpawn.x === x && active.playerSpawn.y === y;
                const inHome =
                  active.botHome &&
                  x >= active.botHome.x &&
                  y >= active.botHome.y &&
                  x < active.botHome.x + active.botHome.width &&
                  y < active.botHome.y + active.botHome.height;

                return (
                  <button
                    key={`${x}:${y}`}
                    type="button"
                    className="tetromaze-editor-cell"
                    onClick={() => onCellClick(x, y)}
                    onMouseEnter={() => setHoverCell({ x, y })}
                    onMouseLeave={() => setHoverCell((prev) => (prev?.x === x && prev?.y === y ? null : prev))}
                    style={{
                      background: cell === "#" ? "#203a64" : "#0b111f",
                      boxShadow: isPreview
                        ? "inset 0 0 0 2px rgba(250, 204, 21, 0.92), inset 0 0 16px rgba(250, 204, 21, 0.25)"
                        : undefined,
                    }}
                    title={`${x},${y}`}
                  >
                    {inHome ? "H" : isPlayer ? "P" : orb ? "*" : loopTag ? "L" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel tetromaze-editor-side">
            <button className="retro-btn" onClick={() => navigate("/tetromaze")}>
              Retour Hub
            </button>
            <h2>Niveaux custom</h2>
            <div className="tetromaze-editor-levels">
              {levels.length === 0 && <div className="tetromaze-editor-empty">Aucun niveau.</div>}
              {levels.map((lvl) => (
                <div className="tetromaze-editor-level-card" key={lvl.id}>
                  <div>{lvl.name ?? lvl.id}</div>
                  <div className="tetromaze-editor-sub">{lvl.id}</div>
                  <div className="tetromaze-editor-sub">Power-ups: {lvl.powerOrbs.length}</div>
                  <div className="tetromaze-editor-sub">Bots: {(lvl.botKinds ?? []).length}</div>
                  <div className="tetromaze-editor-actions">
                    <button className="retro-btn" onClick={() => loadLevel(lvl)}>Charger</button>
                    <button className="retro-btn" onClick={() => removeLevel(lvl.id)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
