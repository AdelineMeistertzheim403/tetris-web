export const DASHBOARD_WIDGET_IDS = [
  "chatbot",
  "tip",
  "resume",
  "modes",
  "focus",
  "progress",
  "activity",
  "create",
  "community",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardWidgetLayout = {
  visible: boolean;
  order: number;
  w: number;
  h: number;
};

export type DashboardSettings = {
  widgets: Record<DashboardWidgetId, DashboardWidgetLayout>;
};

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  label: string;
  description: string;
  fixed: boolean;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  defaultLayout: DashboardWidgetLayout;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const DASHBOARD_WIDGET_DEFINITIONS: DashboardWidgetDefinition[] = [
  {
    id: "chatbot",
    label: "Chatbot",
    description: "Canal principal avec les Tetrobots et les anomalies.",
    fixed: true,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 6,
    defaultLayout: { visible: true, order: 0, w: 2, h: 3 },
  },
  {
    id: "tip",
    label: "Conseil des Tetrobots",
    description: "Conseil actif, humeur et progression du Tetrobot courant.",
    fixed: true,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 5,
    defaultLayout: { visible: true, order: 1, w: 1, h: 3 },
  },
  {
    id: "resume",
    label: "Reprise rapide",
    description: "Raccourci pour reprendre la progression la plus recente.",
    fixed: false,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 4,
    defaultLayout: { visible: true, order: 2, w: 1, h: 2 },
  },
  {
    id: "modes",
    label: "Modes",
    description: "Cartes d'acces vers les modes et hubs principaux.",
    fixed: true,
    minW: 1,
    maxW: 4,
    minH: 3,
    maxH: 7,
    defaultLayout: { visible: true, order: 3, w: 2, h: 4 },
  },
  {
    id: "focus",
    label: "Succes en progression",
    description: "Objectifs d'achievements a viser maintenant.",
    fixed: false,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 5,
    defaultLayout: { visible: true, order: 4, w: 1, h: 3 },
  },
  {
    id: "progress",
    label: "Progression",
    description: "Etat des campagnes et du contenu debloque.",
    fixed: false,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 5,
    defaultLayout: { visible: true, order: 5, w: 1, h: 3 },
  },
  {
    id: "activity",
    label: "Activite recente",
    description: "Resume des derniers evenements et signaux de progression.",
    fixed: false,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 5,
    defaultLayout: { visible: true, order: 6, w: 2, h: 3 },
  },
  {
    id: "create",
    label: "Raccourcis editeurs",
    description: "Acces rapide aux outils de creation.",
    fixed: false,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 4,
    defaultLayout: { visible: true, order: 7, w: 1, h: 2 },
  },
  {
    id: "community",
    label: "Niveaux joueurs",
    description: "Exploration communautaire et contenus partages.",
    fixed: false,
    minW: 1,
    maxW: 4,
    minH: 2,
    maxH: 4,
    defaultLayout: { visible: true, order: 8, w: 1, h: 2 },
  },
];

export const DASHBOARD_WIDGET_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_WIDGET_DEFINITIONS.map((definition) => [definition.id, definition])
) as Record<DashboardWidgetId, DashboardWidgetDefinition>;

export const DASHBOARD_FIXED_WIDGET_IDS = DASHBOARD_WIDGET_DEFINITIONS
  .filter((definition) => definition.fixed)
  .map((definition) => definition.id);

export const DASHBOARD_OPTIONAL_WIDGET_IDS = DASHBOARD_WIDGET_DEFINITIONS
  .filter((definition) => !definition.fixed)
  .map((definition) => definition.id);

export function createDefaultDashboardSettings(): DashboardSettings {
  return {
    widgets: DASHBOARD_WIDGET_DEFINITIONS.reduce(
      (acc, definition) => {
        acc[definition.id] = { ...definition.defaultLayout };
        return acc;
      },
      {} as Record<DashboardWidgetId, DashboardWidgetLayout>
    ),
  };
}

export function sortDashboardWidgetIds(
  widgets: Record<DashboardWidgetId, DashboardWidgetLayout>
): DashboardWidgetId[] {
  return [...DASHBOARD_WIDGET_IDS].sort((a, b) => {
    const byOrder = widgets[a].order - widgets[b].order;
    if (byOrder !== 0) return byOrder;
    return (
      DASHBOARD_WIDGET_DEFINITION_MAP[a].defaultLayout.order -
      DASHBOARD_WIDGET_DEFINITION_MAP[b].defaultLayout.order
    );
  });
}

export function normalizeDashboardSettings(
  raw: Partial<DashboardSettings> | null | undefined
): DashboardSettings {
  const defaults = createDefaultDashboardSettings();
  const rawWidgets = (raw?.widgets ?? {}) as Partial<
    Record<DashboardWidgetId, Partial<DashboardWidgetLayout>>
  >;
  const merged = {} as Record<DashboardWidgetId, DashboardWidgetLayout>;

  for (const definition of DASHBOARD_WIDGET_DEFINITIONS) {
    const defaultLayout = defaults.widgets[definition.id];
    const rawLayout = rawWidgets[definition.id];
    const maxWidth = definition.maxW;
    const effectiveMinWidth = Math.min(definition.minW, maxWidth);

    merged[definition.id] = {
      visible:
        definition.fixed || typeof rawLayout?.visible !== "boolean"
          ? definition.fixed
            ? true
            : defaultLayout.visible
          : rawLayout.visible,
      order:
        typeof rawLayout?.order === "number"
          ? Math.round(rawLayout.order)
          : defaultLayout.order,
      w:
        typeof rawLayout?.w === "number"
          ? clamp(Math.round(rawLayout.w), effectiveMinWidth, maxWidth)
          : defaultLayout.w,
      h:
        typeof rawLayout?.h === "number"
          ? clamp(Math.round(rawLayout.h), definition.minH, definition.maxH)
          : defaultLayout.h,
    };
  }

  const orderedIds = sortDashboardWidgetIds(merged);
  orderedIds.forEach((id, index) => {
    merged[id] = { ...merged[id], order: index };
  });

  return { widgets: merged };
}

export function reorderDashboardWidgets(
  widgets: Record<DashboardWidgetId, DashboardWidgetLayout>,
  orderedIds: DashboardWidgetId[]
): Record<DashboardWidgetId, DashboardWidgetLayout> {
  const next = { ...widgets };
  orderedIds.forEach((id, index) => {
    next[id] = { ...next[id], order: index };
  });
  return next;
}

export function moveDashboardWidget(
  widgets: Record<DashboardWidgetId, DashboardWidgetLayout>,
  draggedId: DashboardWidgetId,
  targetId: DashboardWidgetId | null
): Record<DashboardWidgetId, DashboardWidgetLayout> {
  const orderedIds = sortDashboardWidgetIds(widgets).filter((id) => id !== draggedId);
  const targetIndex = targetId ? orderedIds.indexOf(targetId) : orderedIds.length;
  const insertAt = targetIndex < 0 ? orderedIds.length : targetIndex;
  orderedIds.splice(insertAt, 0, draggedId);
  return reorderDashboardWidgets(widgets, orderedIds);
}

export function clampDashboardWidgetSize(
  widgetId: DashboardWidgetId,
  width: number,
  height: number,
  columnCount: number
) {
  const definition = DASHBOARD_WIDGET_DEFINITION_MAP[widgetId];
  const maxWidth = Math.max(1, Math.min(definition.maxW, columnCount));
  const minWidth = Math.min(definition.minW, maxWidth);

  return {
    w: clamp(Math.round(width), minWidth, maxWidth),
    h: clamp(Math.round(height), definition.minH, definition.maxH),
  };
}

export function getDashboardGridColumnCount(viewportWidth: number) {
  if (viewportWidth <= 900) return 1;
  if (viewportWidth <= 1400) return 2;
  return 4;
}
