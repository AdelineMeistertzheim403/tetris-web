import type { ReactElement } from "react";
import type { DashboardActionIconName } from "../../logic/dashboardOverview";

export function DashboardActionIcon({ name }: { name: DashboardActionIconName }) {
  const iconMap: Record<DashboardActionIconName, ReactElement> = {
    resume: (
      <path d="M12 2a10 10 0 1 0 7.1 2.9 1 1 0 1 0-1.4 1.4A8 8 0 1 1 12 4v3l4-4-4-4z" />
    ),
    hub: (
      <path d="M3 5a2 2 0 0 1 2-2h4v4H5v4H3zm12-2h4a2 2 0 0 1 2 2v6h-2V7h-4zm4 12v4a2 2 0 0 1-2 2h-6v-2h6v-4zM9 21H5a2 2 0 0 1-2-2v-4h2v4h4zm1-12h4v4h-4zm-5 5h4v4H5zm10 0h4v4h-4z" />
    ),
    editor: (
      <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zm14.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.46 1.46 3.75 3.75z" />
    ),
    gallery: (
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H4zm2 2v10h12V7zm1 8 3-4 2 3 2-2 3 3z" />
    ),
    relation: (
      <path d="M7 6h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-3l-4 3v-3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm1 4h8v2H8zm0-3h6v2H8z" />
    ),
    message: (
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4h10v2H7zm0 4h7v2H7z" />
    ),
    help: (
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 15h-1.5v-1.5H12zm1.72-6.22-.67.46A1.92 1.92 0 0 0 12 12.9V13h-1.5v-.26a2.94 2.94 0 0 1 1.27-2.72l.92-.63a1.43 1.43 0 0 0 .66-1.18 1.85 1.85 0 0 0-3.69.11H8.15a3.35 3.35 0 1 1 6.69-.2 2.79 2.79 0 0 1-1.12 2.66z" />
    ),
  };

  return (
    <svg
      className="dashboard-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {iconMap[name]}
    </svg>
  );
}
