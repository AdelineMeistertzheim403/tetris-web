import { describe, expect, it } from "vitest";
import {
  clampDashboardWidgetSize,
  createDefaultDashboardSettings,
  moveDashboardWidget,
  normalizeDashboardSettings,
  sortDashboardWidgetIds,
} from "./dashboardWidgets";

describe("dashboardWidgets", () => {
  it("active tous les widgets par defaut", () => {
    const widgets = createDefaultDashboardSettings().widgets;

    expect(Object.values(widgets).every((layout) => layout.visible)).toBe(true);
  });

  it("force les widgets fixes a rester visibles", () => {
    const normalized = normalizeDashboardSettings({
      widgets: {
        ...createDefaultDashboardSettings().widgets,
        chatbot: { visible: false, order: 9, w: 4, h: 4 },
        tip: { visible: false, order: 8, w: 1, h: 3 },
        modes: { visible: false, order: 7, w: 2, h: 4 },
      },
    });

    expect(normalized.widgets.chatbot.visible).toBe(true);
    expect(normalized.widgets.tip.visible).toBe(true);
    expect(normalized.widgets.modes.visible).toBe(true);
  });

  it("reordonne les widgets quand on en deplace un", () => {
    const widgets = createDefaultDashboardSettings().widgets;
    const next = moveDashboardWidget(widgets, "community", "resume");

    expect(sortDashboardWidgetIds(next).slice(0, 4)).toEqual([
      "chatbot",
      "tip",
      "community",
      "resume",
    ]);
  });

  it("borne la taille selon les contraintes du widget et la grille courante", () => {
    expect(clampDashboardWidgetSize("modes", 9, 1, 2)).toEqual({ w: 2, h: 3 });
    expect(clampDashboardWidgetSize("activity", 0, 9, 4)).toEqual({ w: 1, h: 5 });
  });
});
