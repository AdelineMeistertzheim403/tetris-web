import type { CSSProperties, DragEvent, PointerEvent, ReactNode } from "react";
import type { DashboardWidgetId } from "../../logic/dashboardWidgets";

type DashboardWidgetShellProps = {
  widgetId: DashboardWidgetId;
  label: string;
  fixed: boolean;
  style: CSSProperties;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>, widgetId: DashboardWidgetId) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, widgetId: DashboardWidgetId | null) => void;
  onDragOver: (event: DragEvent<HTMLElement>, widgetId: DashboardWidgetId | null) => void;
  onResizeStart: (event: PointerEvent<HTMLButtonElement>, widgetId: DashboardWidgetId) => void;
  children: ReactNode;
};

export function DashboardWidgetShell({
  widgetId,
  label,
  fixed,
  style,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onResizeStart,
  children,
}: DashboardWidgetShellProps) {
  return (
    <article
      className={`dashboard-widget${isDragging ? " dashboard-widget--dragging" : ""}${
        isDropTarget ? " dashboard-widget--drop-target" : ""
      }`}
      data-widget-id={widgetId}
      style={style}
      onDragOver={(event) => onDragOver(event, widgetId)}
      onDrop={(event) => onDrop(event, widgetId)}
    >
      <div className="dashboard-widget__chrome">
        <div className="dashboard-widget__meta">
          <span className="dashboard-widget__label">{label}</span>
          {fixed ? (
            <span className="dashboard-widget__badge">Toujours visible</span>
          ) : null}
        </div>
        <button
          type="button"
          className="dashboard-widget__drag-handle"
          draggable
          onDragStart={(event) => onDragStart(event, widgetId)}
          onDragEnd={onDragEnd}
          aria-label={`Deplacer le widget ${label}`}
          title="Deplacer le widget"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className="dashboard-widget__body">{children}</div>

      <button
        type="button"
        className="dashboard-widget__resize-handle"
        onPointerDown={(event) => onResizeStart(event, widgetId)}
        aria-label={`Redimensionner le widget ${label}`}
        title="Redimensionner le widget"
      />
    </article>
  );
}
