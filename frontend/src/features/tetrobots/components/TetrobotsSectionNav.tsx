import { NavLink } from "react-router-dom";
import type { BotMood, TetrobotId } from "../../achievements/types/tetrobots";
import { PATHS } from "../../../routes/paths";

type TetrobotsSectionNavProps = {
  isLoggedIn: boolean;
  activeBot?: TetrobotId | null;
  onBotChange?: (bot: TetrobotId) => void;
  botSummaries?: Partial<
    Record<
      TetrobotId,
      {
        level: number;
        mood: BotMood;
        affinity: number;
      }
    >
  >;
};

const BOTS: TetrobotId[] = ["rookie", "pulse", "apex"];

const BOT_LABELS: Record<TetrobotId, string> = {
  rookie: "Rookie",
  pulse: "Pulse",
  apex: "Apex",
};

const MOOD_LABELS: Record<BotMood, string> = {
  angry: "colere",
  neutral: "neutre",
  friendly: "ouvert",
  respect: "respect",
};

export default function TetrobotsSectionNav({
  isLoggedIn,
  activeBot,
  onBotChange,
  botSummaries,
}: TetrobotsSectionNavProps) {
  return (
    <div className="tetrobots-section-nav-wrap">
      <nav className="tetrobots-section-nav tetrobots-section-nav--primary" aria-label="Navigation Tetrobots">
        <NavLink
          to={PATHS.tetrobots}
          end
          className={({ isActive }) =>
            `tetrobots-section-nav__link${isActive ? " tetrobots-section-nav__link--active" : ""}`
          }
        >
          Profils
        </NavLink>
        <NavLink
          to={PATHS.tetrobotsHelp}
          className={({ isActive }) =>
            `tetrobots-section-nav__link${isActive ? " tetrobots-section-nav__link--active" : ""}`
          }
        >
          Aide
        </NavLink>
        {isLoggedIn ? (
          <NavLink
            to={PATHS.tetrobotsRelations}
            className={({ isActive }) =>
              `tetrobots-section-nav__link${isActive ? " tetrobots-section-nav__link--active" : ""}`
            }
          >
            Centre de liaison
          </NavLink>
        ) : null}
      </nav>

      {isLoggedIn && activeBot && onBotChange ? (
        <div className="tetrobots-section-nav tetrobots-section-nav--bots" aria-label="Selection Tetrobot">
          {BOTS.map((bot) => (
            <button
              key={bot}
              type="button"
              onClick={() => onBotChange(bot)}
              className={`tetrobots-section-nav__link tetrobots-section-nav__link--button tetrobots-section-nav__bot${
                bot === activeBot ? " tetrobots-section-nav__link--active" : ""
              }`}
            >
              <span className="tetrobots-section-nav__bot-name">
                {botSummaries?.[bot] ? (
                  <span
                    className={`tetrobots-section-nav__bot-mood tetrobots-section-nav__bot-mood--${botSummaries[bot]?.mood}`}
                    aria-label={`Humeur ${MOOD_LABELS[botSummaries[bot]!.mood]}`}
                    title={`Humeur ${MOOD_LABELS[botSummaries[bot]!.mood]}`}
                  />
                ) : null}
                <span>{BOT_LABELS[bot]}</span>
              </span>
              {botSummaries?.[bot] ? (
                <span className="tetrobots-section-nav__bot-meta">
                  <span>Niv. {botSummaries[bot]?.level}</span>
                  <span>Aff. {botSummaries[bot]?.affinity}</span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
