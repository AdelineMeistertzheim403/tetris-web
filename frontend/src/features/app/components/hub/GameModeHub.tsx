import type { ButtonHTMLAttributes, ReactNode } from "react";

export type GameModeHubStat = {
  content: ReactNode;
  className?: string;
};

type GameModeHubLayoutProps = {
  title: string;
  stats: readonly GameModeHubStat[];
  children: ReactNode;
};

type HubActionRowProps = {
  children: ReactNode;
  className?: string;
};

type HubSectionProps = {
  children: ReactNode;
  className?: string;
  divided?: boolean;
  title?: ReactNode;
};

type HubIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  title: string;
  variant?: "primary" | "secondary";
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function GameModeHubLayout({ title, stats, children }: GameModeHubLayoutProps) {
  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">{title}</h1>

        <div className="pp-hub-grid">
          <section className="panel pp-hub-card">
            <h2 className="text-cyan-200">
              <i
                className="fa-solid fa-chart-line pp-hub-section-icon pp-hub-section-icon--campaign"
                aria-hidden="true"
              />{" "}
              Profil campagne
            </h2>
            {stats.map((stat, index) => (
              <div key={`${title}-stat-${index}`} className={joinClasses("pp-hub-stat", stat.className)}>
                {stat.content}
              </div>
            ))}
          </section>

          <section className="panel pp-hub-card">
            <h2 className="text-pink-300">
              <i className="fa-solid fa-bolt" aria-hidden="true" /> Actions
            </h2>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

export function HubStack({ children, className }: HubActionRowProps) {
  return <div className={joinClasses("pp-hub-stack", className)}>{children}</div>;
}

export function HubActionRow({ children, className }: HubActionRowProps) {
  return <div className={joinClasses("pp-hub-action-row", className)}>{children}</div>;
}

export function HubInlineControl({ children, className }: HubActionRowProps) {
  return <div className={joinClasses("pp-hub-inline-control", className)}>{children}</div>;
}

export function HubSection({
  children,
  className,
  divided = true,
  title,
}: HubSectionProps) {
  return (
    <div className={joinClasses(divided && "pp-hub-divider", "pp-hub-stack", className)}>
      {title && <div className="text-cyan-200">{title}</div>}
      {children}
    </div>
  );
}

export function HubIconButton({
  className,
  icon,
  title,
  type = "button",
  variant = "primary",
  ...buttonProps
}: HubIconButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        "pp-hub-icon-btn",
        variant === "secondary" && "pp-hub-icon-btn--secondary",
        className
      )}
      title={title}
      aria-label={title}
      {...buttonProps}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  );
}
