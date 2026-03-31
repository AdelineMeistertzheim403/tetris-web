import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_KEY_BINDINGS,
  createDefaultModeKeyBindings,
} from "../../game/utils/controls";
import {
  DEFAULT_PIECE_COLORS,
  DEFAULT_UI_COLORS,
  SettingsProvider,
  useSettings,
} from "./SettingsContext";
import { createDefaultDashboardSettings } from "../../app/logic/dashboardWidgets";

const { authState, fetchUserSettingsMock, saveUserSettingsMock } = vi.hoisted(() => ({
  authState: {
    user: { id: 7 },
    loading: false,
  } as { user: null | { id: number }; loading: boolean },
  fetchUserSettingsMock: vi.fn(),
  saveUserSettingsMock: vi.fn(),
}));

vi.mock("../../auth/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../services/settingsService", () => ({
  fetchUserSettings: () => fetchUserSettingsMock(),
  saveUserSettings: (settings: unknown) => saveUserSettingsMock(settings),
}));

function SettingsProbe() {
  const { settings, updateDashboardWidgetVisibility } = useSettings();

  return (
    <div>
      <div data-testid="left-key">{settings.keyBindings.left}</div>
      <div data-testid="resume-visible">
        {String(settings.dashboard.widgets.resume.visible)}
      </div>
      <button type="button" onClick={() => updateDashboardWidgetVisibility("resume", false)}>
        Hide Resume
      </button>
    </div>
  );
}

function SettingsMutationProbe() {
  const {
    settings,
    updateKeyBindings,
    updateModeKeyBinding,
    resetModeKeyBindings,
    updateUiColors,
    updatePieceColors,
    updateDashboardSettings,
    toggleReducedMotion,
    toggleReducedNeon,
    resetDashboardLayout,
    resetSettings,
  } = useSettings();

  return (
    <div>
      <div data-testid="classic-left">{settings.modeKeyBindings.CLASSIQUE.left}</div>
      <div data-testid="sprint-left">{settings.modeKeyBindings.SPRINT.left}</div>
      <div data-testid="roguelike-bomb">{settings.modeKeyBindings.ROGUELIKE.bomb}</div>
      <div data-testid="accent-secondary">{settings.uiColors.accentSecondary}</div>
      <div data-testid="piece-i">{settings.pieceColors.I}</div>
      <div data-testid="community-layout">
        {`${settings.dashboard.widgets.community.visible}:${settings.dashboard.widgets.community.w}x${settings.dashboard.widgets.community.h}`}
      </div>

      <button type="button" onClick={() => updateKeyBindings({ left: "a" })}>
        Update Classic Left
      </button>
      <button
        type="button"
        onClick={() => updateModeKeyBinding("ROGUELIKE", "bomb", "n")}
      >
        Update Roguelike Bomb
      </button>
      <button type="button" onClick={() => resetModeKeyBindings("ROGUELIKE")}>
        Reset Roguelike
      </button>
      <button
        type="button"
        onClick={() => updateUiColors({ accentSecondary: "#abcdef" })}
      >
        Update Accent Secondary
      </button>
      <button type="button" onClick={() => updatePieceColors({ I: "#010203" })}>
        Update Piece I
      </button>
      <button
        type="button"
        onClick={() =>
          updateDashboardSettings({
            widgets: {
              ...settings.dashboard.widgets,
              community: {
                ...settings.dashboard.widgets.community,
                visible: false,
                w: 99,
                h: 1,
              },
            },
          })
        }
      >
        Update Dashboard
      </button>
      <button type="button" onClick={() => toggleReducedMotion(false)}>
        Disable Reduced Motion
      </button>
      <button type="button" onClick={() => toggleReducedNeon(true)}>
        Enable Reduced Neon
      </button>
      <button type="button" onClick={resetDashboardLayout}>
        Reset Dashboard
      </button>
      <button type="button" onClick={resetSettings}>
        Reset All
      </button>
    </div>
  );
}

describe("SettingsProvider integration", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = "";
    document.documentElement.style.cssText = "";
    fetchUserSettingsMock.mockReset();
    saveUserSettingsMock.mockReset();
    authState.user = { id: 7 };
    authState.loading = false;
  });

  it("charge les settings distants puis persiste les mises a jour utilisateur", async () => {
    const modeKeyBindings = createDefaultModeKeyBindings();
    const remoteSettings = {
      keyBindings: { ...DEFAULT_KEY_BINDINGS, left: "A" },
      modeKeyBindings: {
        ...modeKeyBindings,
        CLASSIQUE: { ...modeKeyBindings.CLASSIQUE, left: "A" },
      },
      reducedMotion: true,
      reducedNeon: false,
      uiColors: { ...DEFAULT_UI_COLORS, accent: "#654321" },
      pieceColors: DEFAULT_PIECE_COLORS,
      dashboard: createDefaultDashboardSettings(),
    };

    fetchUserSettingsMock.mockResolvedValue(remoteSettings);
    saveUserSettingsMock.mockResolvedValue(undefined);

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("left-key")).toHaveTextContent("A");
    });

    await waitFor(() => {
      expect(document.body).toHaveClass("reduce-motion");
      expect(document.documentElement.style.getPropertyValue("--ui-accent")).toBe("#654321");
    });

    fireEvent.click(screen.getByRole("button", { name: "Hide Resume" }));

    expect(screen.getByTestId("resume-visible")).toHaveTextContent("false");

    await waitFor(() => {
      expect(saveUserSettingsMock).toHaveBeenCalledOnce();
    }, {
      timeout: 1200,
    });

    expect(saveUserSettingsMock.mock.calls[0][0]).toMatchObject({
      keyBindings: { left: "A" },
      dashboard: {
        widgets: {
          resume: { visible: false },
        },
      },
    });
  });

  it("fusionne le local storage avec les defaults puis applique les mutations et resets", async () => {
    authState.user = null;
    localStorage.setItem(
      "tetris-user-settings",
      JSON.stringify({
        keyBindings: { left: "q" },
        reducedMotion: true,
        uiColors: { accent: "#abc" },
        dashboard: {
          widgets: {
            community: {
              visible: false,
              order: 40,
              w: 99,
              h: 1,
            },
          },
        },
      })
    );

    render(
      <SettingsProvider>
        <SettingsMutationProbe />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("classic-left")).toHaveTextContent("Q");
      expect(screen.getByTestId("sprint-left")).toHaveTextContent("Q");
    });

    await waitFor(() => {
      expect(document.body).toHaveClass("reduce-motion");
      expect(document.documentElement.style.getPropertyValue("--ui-accent-rgb")).toBe(
        "170 187 204"
      );
    });

    expect(screen.getByTestId("community-layout")).toHaveTextContent("false:4x2");

    fireEvent.click(screen.getByRole("button", { name: "Update Classic Left" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Roguelike Bomb" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Accent Secondary" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Piece I" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Disable Reduced Motion" }));
    fireEvent.click(screen.getByRole("button", { name: "Enable Reduced Neon" }));

    expect(screen.getByTestId("classic-left")).toHaveTextContent("A");
    expect(screen.getByTestId("roguelike-bomb")).toHaveTextContent("N");
    expect(screen.getByTestId("accent-secondary")).toHaveTextContent("#abcdef");
    expect(screen.getByTestId("piece-i")).toHaveTextContent("#010203");
    expect(screen.getByTestId("community-layout")).toHaveTextContent("false:4x2");
    expect(document.body).not.toHaveClass("reduce-motion");
    expect(document.body).toHaveClass("reduce-neon");

    fireEvent.click(screen.getByRole("button", { name: "Reset Roguelike" }));
    expect(screen.getByTestId("roguelike-bomb")).toHaveTextContent("B");

    fireEvent.click(screen.getByRole("button", { name: "Reset Dashboard" }));
    expect(screen.getByTestId("community-layout")).toHaveTextContent("true:1x2");

    fireEvent.click(screen.getByRole("button", { name: "Reset All" }));

    await waitFor(() => {
      expect(screen.getByTestId("classic-left")).toHaveTextContent("ArrowLeft");
      expect(screen.getByTestId("accent-secondary")).toHaveTextContent(
        DEFAULT_UI_COLORS.accentSecondary
      );
      expect(screen.getByTestId("piece-i")).toHaveTextContent(DEFAULT_PIECE_COLORS.I);
    });

    expect(document.body).not.toHaveClass("reduce-motion");
    expect(document.body).not.toHaveClass("reduce-neon");
    expect(fetchUserSettingsMock).not.toHaveBeenCalled();
    expect(saveUserSettingsMock).not.toHaveBeenCalled();
  });
});
