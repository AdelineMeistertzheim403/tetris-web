import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import {
  exportLevelJson,
  listCustomLevels,
  mergeCustomLevels,
  parseLevelsFromJson,
  removeCustomLevel,
  upsertCustomLevel,
} from "../utils/customLevels";
import type { BrickType, BrickfallBrick, BrickfallLevel } from "../types/levels";
import {
  deleteBrickfallSoloCustomLevel,
  fetchBrickfallSoloCustomLevels,
  saveBrickfallSoloCustomLevel,
} from "../services/brickfallSoloService";
import "../../../styles/roguelike.css";
import "../../../styles/brickfall-editor.css";

const GRID_W = 25;
const GRID_H = 20;
const CELL_SIZE = 20;

const TYPE_COLORS: Record<BrickType, string> = {
  normal: "#ff7b00",
  armor: "#8b8b8b",
  bonus: "#22c55e",
  malus: "#ef4444",
  explosive: "#facc15",
  cursed: "#7c3aed",
  mirror: "#22d3ee",
};

function makeEmptyLevel(): BrickfallLevel {
  const ts = Date.now().toString(36);
  return {
    id: `custom-${ts}`,
    name: "Niveau custom",
    width: GRID_W,
    height: GRID_H,
    bricks: [],
    boss: false,
  };
}

export default function BrickfallEditor() {
  const navigate = useNavigate();
  const { checkAchievements, updateStats } = useAchievements();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [levels, setLevels] = useState<BrickfallLevel[]>([]);
  const [active, setActive] = useState<BrickfallLevel>(makeEmptyLevel());
  const [selectedType, setSelectedType] = useState<BrickType>("normal");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const local = listCustomLevels();
    setLevels(local);
    (async () => {
      try {
        const remote = await fetchBrickfallSoloCustomLevels();
        const merged = mergeCustomLevels(remote);
        setLevels(merged);
      } catch {
        // Non bloquant: l'editeur reste utilisable avec localStorage.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brickMap = useMemo(() => {
    const map = new Map<string, BrickfallBrick>();
    for (const b of active.bricks) map.set(`${b.x}:${b.y}`, b);
    return map;
  }, [active.bricks]);

  const updateCell = (x: number, y: number) => {
    setActive((prev) => {
      const key = `${x}:${y}`;
      const next = new Map<string, BrickfallBrick>();
      for (const b of prev.bricks) next.set(`${b.x}:${b.y}`, b);
      const existing = next.get(key);
      if (existing && existing.type === selectedType) {
        next.delete(key);
      } else {
        next.set(key, {
          x,
          y,
          type: selectedType,
          hp: selectedType === "armor" ? 3 : 1,
        });
      }
      return { ...prev, bricks: [...next.values()] };
    });
  };

  const save = async () => {
    const merged = upsertCustomLevel(active);
    setLevels(merged);
    try {
      await saveBrickfallSoloCustomLevel(active);
      setError(null);
    } catch {
      setError("Sauvegarde locale OK, mais echec de synchro BDD.");
    }
    const next = updateStats((prev) => ({
      ...prev,
      brickfallSoloEditorCreated: prev.brickfallSoloEditorCreated + 1,
    }));
    checkAchievements({
      mode: "BRICKFALL_SOLO",
      custom: { bf_editor_create: next.brickfallSoloEditorCreated >= 1 },
    });
  };

  const loadLevel = (level: BrickfallLevel) => {
    setActive(level);
  };

  const del = async (id: string) => {
    const next = removeCustomLevel(id);
    setLevels(next);
    try {
      await deleteBrickfallSoloCustomLevel(id);
      setError(null);
    } catch {
      setError("Suppression locale OK, mais echec de synchro BDD.");
    }
    if (active.id === id) {
      const fallback = next[0] ?? makeEmptyLevel();
      setActive(fallback);
    }
  };

  const importFromJsonText = async (jsonText: string) => {
    try {
      const parsed = parseLevelsFromJson(jsonText);
      if (!parsed.length) {
        setError("JSON invalide ou vide");
        return;
      }
      const merged = mergeCustomLevels(parsed);
      setLevels(merged);
      setActive(parsed[0]);
      await Promise.allSettled(parsed.map((lvl) => saveBrickfallSoloCustomLevel(lvl)));
      setError(null);
    } catch {
      setError("Impossible d'importer ce JSON");
    }
  };

  const openImportFileDialog = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const onImportFileSelected = async (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      const jsonText = await file.text();
      await importFromJsonText(jsonText);
    } catch {
      setError("Impossible de lire ce fichier JSON");
    }
  };

  const exportActive = () => {
    const json = exportLevelJson(active);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="brickfall-editor text-pink-300 font-['Press_Start_2P']">
      <div className="brickfall-editor-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFileSelected}
      />
      <div className="brickfall-editor-head">
        <h1 className="text-2xl text-yellow-300">Brickfall - Editeur de niveaux</h1>
        <button className="retro-btn" onClick={() => navigate("/brickfall-solo")}>
          Retour Solo
        </button>
      </div>

      <div className="brickfall-editor-columns">
        <div className="panel brickfall-editor-side space-y-3">
          <div className="text-xs">ID</div>
          <input
            className="w-full px-2 py-2 bg-black/40 border border-pink-600 rounded text-xs"
            value={active.id}
            onChange={(e) => setActive((p) => ({ ...p, id: e.target.value }))}
          />
          <div className="text-xs">Nom</div>
          <input
            className="w-full px-2 py-2 bg-black/40 border border-pink-600 rounded text-xs"
            value={active.name}
            onChange={(e) => setActive((p) => ({ ...p, name: e.target.value }))}
          />
          <label className="text-xs flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(active.boss)}
              onChange={(e) => setActive((p) => ({ ...p, boss: e.target.checked }))}
            />
            Boss
          </label>

          <div className="text-xs">Type de bloc</div>
          <div className="grid grid-cols-2 gap-2">
            {(["normal", "armor", "bonus", "malus", "explosive", "cursed", "mirror"] as BrickType[]).map((t) => (
              <button
                key={t}
                className="retro-btn text-left"
                style={{ borderColor: selectedType === t ? "#facc15" : undefined }}
                onClick={() => setSelectedType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="retro-btn flex-1" onClick={save}>
              Sauver
            </button>
            <button
              className="retro-btn flex-1"
                onClick={() => {
                  const empty = makeEmptyLevel();
                  setActive(empty);
                }}
              >
                Nouveau
            </button>
          </div>
          <button className="retro-btn w-full" onClick={exportActive}>
            Export JSON
          </button>
          <button className="retro-btn w-full" onClick={openImportFileDialog}>
            Import JSON
          </button>
          <button
            className="retro-btn w-full"
            onClick={() => navigate(`/brickfall-solo/play?custom=${encodeURIComponent(active.id)}`)}
          >
            Jouer ce niveau
          </button>

          {error && <div className="text-red-300 text-xs">{error}</div>}
        </div>

        <div className="panel brickfall-editor-grid-card">
          <div
            className="grid gap-[1px] bg-cyan-900/30 brickfall-editor-grid"
            style={{ gridTemplateColumns: `repeat(${GRID_W}, ${CELL_SIZE}px)`, gap: "0px" }}
          >
            {Array.from({ length: GRID_H * GRID_W }, (_, i) => {
              const x = i % GRID_W;
              const y = Math.floor(i / GRID_W);
              const brick = brickMap.get(`${x}:${y}`);
              return (
                <div
                  key={`${x}:${y}`}
                  onClick={() => updateCell(x, y)}
                  className="cursor-pointer"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: brick ? TYPE_COLORS[brick.type] : "#0b0b14",
                    boxShadow: "inset 0 0 0 1px rgba(8, 47, 73, 0.65)",
                  }}
                  title={`${x},${y}${brick ? ` - ${brick.type}` : ""}`}
                />
              );
            })}
          </div>
        </div>

        <div className="panel brickfall-editor-side">
          <h2 className="text-sm text-yellow-300 mb-3">Niveaux sauvegardés</h2>
          <div className="max-h-[620px] overflow-auto space-y-2">
            {levels.length === 0 && <div className="text-xs text-gray-300">Aucun niveau custom.</div>}
            {levels.map((lvl) => (
              <div key={lvl.id} className="border border-pink-700 rounded p-2 text-xs">
                <div className="text-cyan-200">{lvl.name}</div>
                <div className="text-gray-300">id: {lvl.id}</div>
                <div className="text-gray-300">blocs: {lvl.bricks.length}</div>
                <div className="flex gap-2 mt-2">
                  <button className="retro-btn flex-1" onClick={() => loadLevel(lvl)}>
                    Charger
                  </button>
                  <button className="retro-btn flex-1" onClick={() => del(lvl.id)}>
                    Supprimer
                  </button>
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
