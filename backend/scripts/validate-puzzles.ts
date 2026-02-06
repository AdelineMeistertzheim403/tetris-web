import {
  generateBatch,
  generatedPuzzles,
  loadPuzzles,
  normalizeBoard,
  type PuzzleSeedRow,
} from "../prisma/puzzleData";

type Issue = {
  id: string;
  name: string;
  message: string;
};

const isFreeZoneClear = (
  board: number[][],
  zone: { x: number; y: number; width: number; height: number }
) => {
  for (let y = zone.y; y < zone.y + zone.height; y += 1) {
    for (let x = zone.x; x < zone.x + zone.width; x += 1) {
      if (board[y]?.[x]) return false;
    }
  }
  return true;
};

const validatePuzzle = (puzzle: PuzzleSeedRow): Issue[] => {
  const issues: Issue[] = [];
  const def = puzzle.definition;
  const board = normalizeBoard(def.initialBoard);
  const objectives = def.objectives ?? [];

  if (!objectives.length) {
    issues.push({
      id: puzzle.id,
      name: puzzle.name,
      message: "Aucun objectif défini.",
    });
  }

  const hasClearObjective = objectives.some((obj) => obj.type === "clear_lines");
  if (def.contracts?.noLineClears && hasClearObjective) {
    issues.push({
      id: puzzle.id,
      name: puzzle.name,
      message: "Contrat noLineClears incompatible avec un objectif clear_lines.",
    });
  }

  for (const obj of objectives) {
    if (obj.type === "free_zone") {
      const x = Number(obj.x);
      const y = Number(obj.y);
      const width = Number(obj.width);
      const height = Number(obj.height);
      if (x < 0 || y < 0 || x + width > 10 || y + height > 20) {
        issues.push({
          id: puzzle.id,
          name: puzzle.name,
          message: `free_zone hors limites (x:${x}, y:${y}, w:${width}, h:${height}).`,
        });
      } else if (isFreeZoneClear(board, { x, y, width, height })) {
        issues.push({
          id: puzzle.id,
          name: puzzle.name,
          message: "free_zone déjà libérée au départ.",
        });
      }
    } else if (obj.type === "survive_pieces") {
      const count = Number(obj.count ?? 0);
      if (def.sequence?.length && count > def.sequence.length) {
        issues.push({
          id: puzzle.id,
          name: puzzle.name,
          message: `survive_pieces (${count}) > longueur de la séquence (${def.sequence.length}).`,
        });
      }
      if (def.maxMoves !== undefined && count > def.maxMoves) {
        issues.push({
          id: puzzle.id,
          name: puzzle.name,
          message: `survive_pieces (${count}) > maxMoves (${def.maxMoves}).`,
        });
      }
    } else if (obj.type === "clear_lines") {
      const count = Number(obj.count ?? 0);
      if (def.maxMoves !== undefined && count > def.maxMoves) {
        issues.push({
          id: puzzle.id,
          name: puzzle.name,
          message: `clear_lines (${count}) > maxMoves (${def.maxMoves}).`,
        });
      }
    } else {
      issues.push({
        id: puzzle.id,
        name: puzzle.name,
        message: `Type d'objectif inconnu: ${(obj as { type?: string }).type ?? "?"}.`,
      });
    }
  }

  return issues;
};

const formatIssues = (issues: Issue[]) =>
  issues
    .map((issue) => `- ${issue.id} (${issue.name}): ${issue.message}`)
    .join("\n");

async function main() {
  const puzzles = [
    ...(await loadPuzzles()),
    ...generatedPuzzles,
    ...generateBatch(),
  ];

  const issues = puzzles.flatMap(validatePuzzle);

  if (issues.length === 0) {
    console.log("✅ Validation puzzles: aucun problème détecté.");
    return;
  }

  console.error("❌ Validation puzzles: problèmes détectés.");
  console.error(formatIssues(issues));
  process.exit(1);
}

main().catch((err) => {
  console.error("Validation error:", err);
  process.exit(1);
});
