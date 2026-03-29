import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TetrobotFinaleOverlay from "./TetrobotFinaleOverlay";

describe("TetrobotFinaleOverlay integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.style.overflow = "";
  });

  it("runs through the finale flow and resolves the selected outcome", async () => {
    const onResolve = vi.fn();
    const { rerender } = render(<TetrobotFinaleOverlay open onResolve={onResolve} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    for (let step = 0; step < 6; step += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(820);
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Je veux continuer." }));
    expect(screen.getByText("... interessant.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer a observer" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer l'issue" }));

    expect(onResolve).toHaveBeenCalledOnce();
    expect(onResolve).toHaveBeenCalledWith("observe");

    rerender(<TetrobotFinaleOverlay open={false} onResolve={onResolve} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
