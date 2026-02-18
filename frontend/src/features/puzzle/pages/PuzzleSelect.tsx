// Page applicative routable.
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { PuzzleDefinition } from "../types/Puzzle";
import { fetchPuzzleCompletions, fetchPuzzles } from "../services/puzzleService";

export default function PuzzleSelect() {
  const [puzzles, setPuzzles] = useState<PuzzleDefinition[]>([]);
  const [completions, setCompletions] = useState(
    new Map<string, { success: boolean; optimal: boolean; attempts: number }>()
  );
  const [completionFilter, setCompletionFilter] = useState<
    "all" | "completed" | "incomplete"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<
    "all" | "easy" | "normal" | "hard" | "very hard" | "extreme"
  >("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [data, done] = await Promise.all([
          fetchPuzzles(),
          fetchPuzzleCompletions().catch(() => []),
        ]);
        if (active) {
          setPuzzles(data);
          setCompletions(
            new Map(
              done.map((row) => [
                row.puzzleId,
                {
                  success: row.success,
                  optimal: row.optimal,
                  attempts: row.attempts,
                },
              ])
            )
          );
        }
      } catch (err) {
        if (active) setError("Impossible de charger les puzzles.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen px-10 py-10 text-pink-300 bg-black">
      <header className="mb-8">
        <h1 className="text-3xl text-yellow-400 mb-2">Mode Énigme / Puzzle</h1>
        <p className="text-sm text-pink-200">
          Plateaux prédéfinis, séquence fixe, objectifs précis. Optimise tes coups.
        </p>
        <div className="mt-4 flex gap-2 flex-wrap">
          {(["all", "easy", "normal", "hard", "very hard", "extreme"] as const).map(
            (level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-3 py-1 rounded text-sm border ${
                difficulty === level
                  ? "bg-pink-600 border-pink-400 text-white"
                  : "bg-black/40 border-pink-500/40 text-pink-200"
              }`}
            >
              {level === "all" ? "Tous" : level}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {([
            { id: "all", label: "Tous" },
            { id: "completed", label: "Réussis" },
            { id: "incomplete", label: "Non réussis" },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setCompletionFilter(item.id)}
              className={`px-3 py-1 rounded text-sm border ${
                completionFilter === item.id
                  ? "bg-emerald-600/80 border-emerald-400 text-white"
                  : "bg-black/40 border-emerald-500/40 text-emerald-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {loading && <p className="text-pink-200">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {puzzles
            .filter((puzzle) => difficulty === "all" || puzzle.difficulty === difficulty)
            .filter((puzzle) => {
              if (completionFilter === "all") return true;
              const completion = completions.get(puzzle.id);
              const isDone = completion?.success ?? false;
              return completionFilter === "completed" ? isDone : !isDone;
            })
            .sort((a, b) => {
              const rank = (value?: string) => {
                switch (value) {
                  case "easy":
                    return 0;
                  case "normal":
                    return 1;
                  case "hard":
                    return 2;
                  case "very hard":
                    return 3;
                  case "extreme":
                    return 4;
                  default:
                    return 1;
                }
              };
              const diff = rank(a.difficulty) - rank(b.difficulty);
              if (diff !== 0) return diff;
              return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            })
            .map((puzzle) => (
            <article
              key={puzzle.id}
              className="border border-pink-500/50 rounded-lg p-4 bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl text-yellow-300">{puzzle.name}</h2>
                {completions.get(puzzle.id)?.success && (
                  <div className="flex gap-1 items-center">
                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-400/40">
                      ✅ Réussi
                    </span>
                    {completions.get(puzzle.id)?.optimal && (
                      <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        Optimal
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-pink-200 mb-4">{puzzle.description}</p>
              <div className="text-xs text-pink-300 mb-4">
                <div>Objectifs : {puzzle.objectives.length}</div>
                {puzzle.maxMoves !== undefined && (
                  <div>Moves max : {puzzle.maxMoves}</div>
                )}
                {puzzle.difficulty && <div>Difficulté : {puzzle.difficulty}</div>}
                <div>
                  Tentatives : {completions.get(puzzle.id)?.attempts ?? 0}
                </div>
              </div>
              <Link
                to={`/puzzle/${puzzle.id}`}
                className="inline-block px-4 py-2 rounded-md bg-pink-600 text-white hover:bg-pink-500"
              >
                Jouer
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
