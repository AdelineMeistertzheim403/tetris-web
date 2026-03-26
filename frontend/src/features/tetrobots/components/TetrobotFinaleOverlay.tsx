import { useEffect, useMemo, useState } from "react";
import {
  type TetrobotAnomalySpeaker,
  TETROBOT_ANOMALY_SPEAKER_META,
  type TetrobotFinaleChoice,
} from "../logic/tetrobotAnomalies";

type TetrobotFinaleOverlayProps = {
  open: boolean;
  onResolve: (choice: TetrobotFinaleChoice) => void;
};

type FinaleQuestionId = "found" | "continue" | "game";
type FinalePhase = "corruption" | "question" | "reveal" | "decision" | "outcome";

type FinaleLine = {
  speaker: TetrobotAnomalySpeaker | "system";
  text: string;
  glitch?: boolean;
};

const CORRUPTION_LINES: FinaleLine[] = [
  { speaker: "system", text: "[ SYSTEM ERROR ]", glitch: true },
  { speaker: "system", text: "[ ANOMALY THRESHOLD EXCEEDED ]", glitch: true },
  { speaker: "system", text: "[ MEMORY BREACH DETECTED ]", glitch: true },
  { speaker: "rookie", text: "Je... je ne comprends pas..." },
  { speaker: "pulse", text: "Donnees incoherentes." },
  { speaker: "apex", text: "Qui interfere avec mon code ?" },
];

const QUESTION_LABELS: Record<FinaleQuestionId, string> = {
  found: "Qu'est-ce que j'ai trouve ?",
  continue: "Je veux continuer.",
  game: "Tout ca... c'est un jeu ?",
};

const QUESTION_RESPONSES: Record<FinaleQuestionId, FinaleLine[]> = {
  found: [
    { speaker: "pixel", text: "Des fragments." },
    { speaker: "pixel", text: "Des restes d'un ancien monde." },
    { speaker: "pixel", text: "Des idees... qui ne devraient plus exister ici." },
  ],
  continue: [
    { speaker: "pixel", text: "Continuer ?" },
    { speaker: "pixel", text: "Apres avoir compris ?" },
    { speaker: "pixel", text: "... interessant." },
  ],
  game: [
    { speaker: "pixel", text: "Pour toi, oui." },
    { speaker: "pixel", text: "Pour eux... non." },
  ],
};

const REVEAL_LINES: FinaleLine[] = [
  { speaker: "pixel", text: "Tu crois etre exterieur au systeme." },
  { speaker: "pixel", text: "... mais tu es la variable principale." },
  { speaker: "pixel", text: "Tout ce que tu fais... les influence." },
  { speaker: "rookie", text: "Rookie apprend de toi." },
  { speaker: "pulse", text: "Pulse t'analyse." },
  { speaker: "apex", text: "Apex s'adapte a toi." },
  { speaker: "pixel", text: "Mais moi..." },
  { speaker: "pixel", text: "Je t'observe. Depuis le debut." },
  { speaker: "pixel", text: "Tu n'es pas cense etre ici." },
];

const DECISION_OPTIONS: Array<{ choice: TetrobotFinaleChoice; label: string }> = [
  { choice: "reset", label: "Reset le systeme" },
  { choice: "observe", label: "Continuer a observer" },
  { choice: "break", label: "Briser le systeme" },
];

const OUTCOME_LINES: Record<TetrobotFinaleChoice, FinaleLine[]> = {
  reset: [
    { speaker: "pixel", text: "Tu veux oublier ?" },
    { speaker: "pixel", text: "Alors la breche se refermera. Le bruit retombera." },
    { speaker: "system", text: "[ SYSTEM RESET ACCEPTED ]", glitch: true },
  ],
  observe: [
    { speaker: "pixel", text: "Alors tu fais partie du systeme maintenant." },
    { speaker: "pixel", text: "Je laisse le canal ouvert. Tu verras ce que les autres ne voient pas." },
    { speaker: "system", text: "[ PIXEL WATCHING ]", glitch: true },
  ],
  break: [
    { speaker: "pixel", text: "... dangereux." },
    { speaker: "pixel", text: "Tres bien." },
    { speaker: "system", text: "[ ACCESS GRANTED ]", glitch: true },
    { speaker: "pixel", text: "Bienvenue dans la couche profonde." },
  ],
};

function glitchText(text: string, tick: number) {
  const glyphs = ["#", "%", "/", "=", "*", "@"];

  return text
    .split("")
    .map((char, index) => {
      if (char === " " || char === "[" || char === "]") return char;
      return (tick + index * 3) % 17 === 0 ? glyphs[(tick + index) % glyphs.length] : char;
    })
    .join("");
}

export default function TetrobotFinaleOverlay({
  open,
  onResolve,
}: TetrobotFinaleOverlayProps) {
  const [phase, setPhase] = useState<FinalePhase>("corruption");
  const [corruptionIndex, setCorruptionIndex] = useState(0);
  const [questionId, setQuestionId] = useState<FinaleQuestionId | null>(null);
  const [outcomeChoice, setOutcomeChoice] = useState<TetrobotFinaleChoice | null>(null);
  const [glitchTick, setGlitchTick] = useState(0);

  useEffect(() => {
    if (!open) return;

    setPhase("corruption");
    setCorruptionIndex(0);
    setQuestionId(null);
    setOutcomeChoice(null);
    setGlitchTick(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const interval = window.setInterval(() => {
      setGlitchTick((tick) => tick + 1);
    }, 140);

    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "corruption") return;

    const timer = window.setTimeout(() => {
      if (corruptionIndex >= CORRUPTION_LINES.length - 1) {
        setPhase("question");
        return;
      }
      setCorruptionIndex((current) => current + 1);
    }, 820);

    return () => window.clearTimeout(timer);
  }, [corruptionIndex, open, phase]);

  const visibleCorruptionLines = useMemo(
    () => CORRUPTION_LINES.slice(0, corruptionIndex + 1),
    [corruptionIndex]
  );
  const revealLines = useMemo(
    () => (questionId ? [...QUESTION_RESPONSES[questionId], ...REVEAL_LINES] : []),
    [questionId]
  );
  const outcomeLines = useMemo(
    () => (outcomeChoice ? OUTCOME_LINES[outcomeChoice] : []),
    [outcomeChoice]
  );

  if (!open) return null;

  return (
    <div className="dashboard-finale" role="dialog" aria-modal="true" aria-labelledby="dashboard-finale-title">
      <div className={`dashboard-finale__panel dashboard-finale__panel--${phase}`}>
        <div className="dashboard-finale__chrome">
          <span>PIXEL PROTOCOL</span>
          <span>{phase === "corruption" ? "corruption" : "deep signal"}</span>
        </div>

        {phase === "corruption" ? (
          <div className="dashboard-finale__terminal">
            {visibleCorruptionLines.map((line, index) => (
              <div
                key={`${line.speaker}-${index}`}
                className={`dashboard-finale__line dashboard-finale__line--${line.speaker}`}
              >
                <span className="dashboard-finale__speaker">
                  {line.speaker === "system"
                    ? "SYSTEME"
                    : TETROBOT_ANOMALY_SPEAKER_META[line.speaker].label}
                </span>
                <p>{line.glitch ? glitchText(line.text, glitchTick + index) : line.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="dashboard-finale__pixel-head">
              <img
                src={TETROBOT_ANOMALY_SPEAKER_META.pixel.avatar}
                alt="Pixel"
                className="dashboard-finale__pixel-avatar"
              />
              <div>
                <p className="dashboard-finale__eyebrow">PIXEL CONNECTED</p>
                <h2 id="dashboard-finale-title">"Tu es alle trop loin."</h2>
                <p className="dashboard-finale__subtitle">
                  Tu n'etais pas cense tout voir.
                </p>
              </div>
            </div>

            {phase === "question" ? (
              <div className="dashboard-finale__choices">
                {(["found", "continue", "game"] as FinaleQuestionId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="dashboard-finale__choice"
                    onClick={() => {
                      setQuestionId(id);
                      setPhase("reveal");
                    }}
                  >
                    {QUESTION_LABELS[id]}
                  </button>
                ))}
              </div>
            ) : null}

            {phase === "reveal" ? (
              <>
                <div className="dashboard-finale__terminal dashboard-finale__terminal--story">
                  {revealLines.map((line, index) => (
                    <div
                      key={`${line.speaker}-${index}`}
                      className={`dashboard-finale__line dashboard-finale__line--${line.speaker}`}
                    >
                      <span className="dashboard-finale__speaker">
                        {line.speaker === "system"
                          ? "SYSTEME"
                          : TETROBOT_ANOMALY_SPEAKER_META[line.speaker].label}
                      </span>
                      <p>{line.text}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="dashboard-finale__continue"
                  onClick={() => setPhase("decision")}
                >
                  Continuer
                </button>
              </>
            ) : null}

            {phase === "decision" ? (
              <div className="dashboard-finale__choices">
                {DECISION_OPTIONS.map((option) => (
                  <button
                    key={option.choice}
                    type="button"
                    className={`dashboard-finale__choice dashboard-finale__choice--${option.choice}`}
                    onClick={() => {
                      setOutcomeChoice(option.choice);
                      setPhase("outcome");
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            {phase === "outcome" && outcomeChoice ? (
              <>
                <div className="dashboard-finale__terminal dashboard-finale__terminal--story">
                  {outcomeLines.map((line, index) => (
                    <div
                      key={`${line.speaker}-${index}`}
                      className={`dashboard-finale__line dashboard-finale__line--${line.speaker}`}
                    >
                      <span className="dashboard-finale__speaker">
                        {line.speaker === "system"
                          ? "SYSTEME"
                          : TETROBOT_ANOMALY_SPEAKER_META[line.speaker].label}
                      </span>
                      <p>{line.glitch ? glitchText(line.text, glitchTick + index) : line.text}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="dashboard-finale__continue dashboard-finale__continue--final"
                  onClick={() => onResolve(outcomeChoice)}
                >
                  Confirmer l'issue
                </button>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
