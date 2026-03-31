import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsProvider } from "../context/SettingsContext";
import Settings from "./Settings";

const { authState } = vi.hoisted(() => ({
  authState: {
    user: null as null | { id: number },
    loading: false,
  },
}));

vi.mock("../../auth/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../../app/components/dashboard/DashboardScene", () => ({
  DashboardScene: ({
    children,
  }: {
    children: (params: { renderWidget: (widgetId: string) => React.ReactNode }) => React.ReactNode;
  }) =>
    children({
      renderWidget: (widgetId: string) => (
        <div data-testid={`widget-${widgetId}`}>{widgetId}</div>
      ),
    }),
}));

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <Settings />
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("Settings page", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = "";
    document.documentElement.style.cssText = "";
    authState.user = null;
    authState.loading = false;
  });

  it("gere les sous-onglets de controles et les conflits de touches par mode", async () => {
    renderSettingsPage();

    const controlsCategories = screen.getByRole("tablist", {
      name: /Categories de controles/i,
    });
    fireEvent.click(
      within(controlsCategories).getByText("Pixel Protocol").closest("button") as HTMLButtonElement
    );

    const jumpRow = screen.getByText("Saut").closest(".keybind-row") as HTMLElement | null;
    expect(jumpRow).not.toBeNull();

    fireEvent.click(within(jumpRow!).getByRole("button", { name: "Changer" }));
    fireEvent.keyDown(window, { key: "e" });

    expect(
      await screen.findByText(/La touche E est deja utilisee pour Hack\./i)
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "j" });

    expect(within(jumpRow!).getByText("J")).toBeInTheDocument();

    fireEvent.click(
      within(controlsCategories).getByText("Mode Tetris").closest("button") as HTMLButtonElement
    );

    const tetrisVariants = screen.getByRole("tablist", {
      name: /Variantes du mode Tetris/i,
    });
    fireEvent.click(
      within(tetrisVariants).getByText("Roguelike").closest("button") as HTMLButtonElement
    );

    expect(screen.getByText("Bombe")).toBeInTheDocument();
    expect(screen.getByText("Time Freeze")).toBeInTheDocument();

    fireEvent.click(
      within(tetrisVariants).getByText("Classique").closest("button") as HTMLButtonElement
    );

    expect(screen.queryByText("Bombe")).not.toBeInTheDocument();
    expect(screen.queryByText("Time Freeze")).not.toBeInTheDocument();
  });

  it("met a jour l'accessibilite et le dashboard embarque", async () => {
    renderSettingsPage();

    const settingsTabs = screen.getAllByRole("tablist", {
      name: /Sections des paramètres/i,
    })[0];

    fireEvent.click(
      within(settingsTabs).getByRole("tab", {
        name: /AccessibilitesConfort visuel, animations et couleurs\./i,
      })
    );
    fireEvent.click(screen.getByLabelText(/Désactiver les animations/i));
    fireEvent.click(screen.getByLabelText(/Désactiver les effets néon/i));

    expect(document.body).toHaveClass("reduce-motion");
    expect(document.body).toHaveClass("reduce-neon");

    fireEvent.change(screen.getByLabelText(/Accent principal/i), {
      target: { value: "#123456" },
    });

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--ui-accent")).toBe("#123456");
    });

    fireEvent.click(
      within(settingsTabs).getByRole("tab", {
        name: /DashboardWidgets affiches et disposition\./i,
      })
    );

    const resumeCheckbox = screen.getByRole("checkbox", { name: /Reprise rapide/i });
    fireEvent.click(resumeCheckbox);

    expect(screen.getByText("Modifications non sauvegardees.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sauvegarder la disposition/i }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("tetris-user-settings") ?? "{}");
      expect(saved.dashboard.widgets.resume.visible).toBe(false);
    });

    fireEvent.click(
      screen.getByText("Disposition").closest("button") as HTMLButtonElement
    );

    expect(screen.getByText(/Organisation des widgets/i)).toBeInTheDocument();
    expect(screen.getByTestId("widget-chatbot")).toBeInTheDocument();
    expect(screen.queryByTestId("widget-resume")).not.toBeInTheDocument();
  });
});
