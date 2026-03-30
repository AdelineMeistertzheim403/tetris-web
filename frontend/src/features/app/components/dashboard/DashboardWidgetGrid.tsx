import {
  type CSSProperties,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DASHBOARD_WIDGET_DEFINITION_MAP,
  clampDashboardWidgetSize,
  getDashboardGridColumnCount,
  moveDashboardWidget,
  sortDashboardWidgetIds,
  type DashboardWidgetId,
  type DashboardWidgetLayout,
} from "../../logic/dashboardWidgets";
import { DashboardWidgetShell } from "./DashboardWidgetShell";

const DASHBOARD_DESKTOP_GRID_GAP = 28;
const DASHBOARD_DESKTOP_ROW_HEIGHT = 92;
const DASHBOARD_MOBILE_GRID_GAP = 22;
const DASHBOARD_MOBILE_ROW_HEIGHT = 82;

type ResizeSession = {
  widgetId: DashboardWidgetId;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  columnCount: number;
  containerWidth: number;
  gridGap: number;
  rowHeight: number;
};

type DashboardWidgetGridProps = {
  widgets: Record<DashboardWidgetId, DashboardWidgetLayout>;
  renderWidget: (widgetId: DashboardWidgetId) => ReactNode;
  editable?: boolean;
  onWidgetsChange?: (next: Record<DashboardWidgetId, DashboardWidgetLayout>) => void;
};

export function DashboardWidgetGrid({
  widgets,
  renderWidget,
  editable = false,
  onWidgetsChange,
}: DashboardWidgetGridProps) {
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);
  const [dropTargetId, setDropTargetId] = useState<DashboardWidgetId | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1600 : window.innerWidth
  );
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const widgetsRef = useRef(widgets);
  const resizeSessionRef = useRef<ResizeSession | null>(null);

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columnCount = getDashboardGridColumnCount(viewportWidth);
  const isMobileLayout = viewportWidth <= 900;
  const gridGap = isMobileLayout ? DASHBOARD_MOBILE_GRID_GAP : DASHBOARD_DESKTOP_GRID_GAP;
  const rowHeight = isMobileLayout
    ? DASHBOARD_MOBILE_ROW_HEIGHT
    : DASHBOARD_DESKTOP_ROW_HEIGHT;
  const orderedWidgetIds = useMemo(() => sortDashboardWidgetIds(widgets), [widgets]);
  const visibleWidgetIds = useMemo(
    () => orderedWidgetIds.filter((id) => widgets[id].visible),
    [orderedWidgetIds, widgets]
  );
  const layoutStyle = useMemo(
    () =>
      ({
        "--dashboard-grid-gap": `${gridGap}px`,
        "--dashboard-row-height": `${rowHeight}px`,
      }) as CSSProperties,
    [gridGap, rowHeight]
  );

  const commitWidgets = (nextWidgets: Record<DashboardWidgetId, DashboardWidgetLayout>) => {
    widgetsRef.current = nextWidgets;
    onWidgetsChange?.(nextWidgets);
  };

  const handleWidgetDragStart = (
    event: DragEvent<HTMLButtonElement>,
    widgetId: DashboardWidgetId
  ) => {
    if (!editable) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", widgetId);
    setDraggedWidgetId(widgetId);
    setDropTargetId(null);
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidgetId(null);
    setDropTargetId(null);
  };

  const handleWidgetDragOver = (
    event: DragEvent<HTMLElement>,
    widgetId: DashboardWidgetId | null
  ) => {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(widgetId);
  };

  const handleWidgetDrop = (
    event: DragEvent<HTMLElement>,
    widgetId: DashboardWidgetId | null
  ) => {
    if (!editable || !draggedWidgetId) return;
    event.preventDefault();
    event.stopPropagation();
    const nextWidgets = moveDashboardWidget(widgetsRef.current, draggedWidgetId, widgetId);
    commitWidgets(nextWidgets);
    setDraggedWidgetId(null);
    setDropTargetId(null);
  };

  const handleResizeMove = useEffectEvent((event: PointerEvent) => {
    const session = resizeSessionRef.current;
    if (!session) return;

    const cellWidth = Math.max(
      1,
      (session.containerWidth - session.gridGap * (session.columnCount - 1)) /
        session.columnCount
    );
    const widthDelta = Math.round(
      (event.clientX - session.startX) / (cellWidth + session.gridGap)
    );
    const heightDelta = Math.round(
      (event.clientY - session.startY) / (session.rowHeight + session.gridGap)
    );
    const nextSize = clampDashboardWidgetSize(
      session.widgetId,
      session.startW + widthDelta,
      session.startH + heightDelta,
      session.columnCount
    );

    commitWidgets({
      ...widgetsRef.current,
      [session.widgetId]: {
        ...widgetsRef.current[session.widgetId],
        ...nextSize,
      },
    });
  });

  const handleResizeEnd = useEffectEvent(() => {
    if (!resizeSessionRef.current) return;
    resizeSessionRef.current = null;
    setIsResizing(false);
  });

  useEffect(() => {
    if (!editable || !isResizing) return;

    const onPointerMove = (event: PointerEvent) => handleResizeMove(event);
    const onPointerUp = () => handleResizeEnd();

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [editable, handleResizeEnd, handleResizeMove, isResizing]);

  const handleResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    widgetId: DashboardWidgetId
  ) => {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();

    const containerWidth = layoutRef.current?.getBoundingClientRect().width;
    if (!containerWidth) return;

    const widget = widgetsRef.current[widgetId];
    resizeSessionRef.current = {
      widgetId,
      startX: event.clientX,
      startY: event.clientY,
      startW: widget.w,
      startH: widget.h,
      columnCount,
      containerWidth,
      gridGap,
      rowHeight,
    };
    setIsResizing(true);
  };

  return (
    <div
      ref={layoutRef}
      className={`dashboard-layout${editable ? " dashboard-layout--editable" : ""}`}
      style={layoutStyle}
      onDragOver={editable ? (event) => handleWidgetDragOver(event, null) : undefined}
      onDrop={editable ? (event) => handleWidgetDrop(event, null) : undefined}
    >
      {visibleWidgetIds.map((widgetId) => {
        const definition = DASHBOARD_WIDGET_DEFINITION_MAP[widgetId];
        const layout = widgets[widgetId];
        const width = Math.min(layout.w, columnCount);
        const style = {
          gridColumn: `span ${width}`,
          gridRow: `span ${layout.h}`,
          order: layout.order,
        };

        if (!editable) {
          return (
            <section
              key={widgetId}
              className="dashboard-layout__item"
              data-widget-id={widgetId}
              style={style}
            >
              <div className="dashboard-layout__surface">{renderWidget(widgetId)}</div>
            </section>
          );
        }

        return (
          <DashboardWidgetShell
            key={widgetId}
            widgetId={widgetId}
            label={definition.label}
            fixed={definition.fixed}
            isDragging={draggedWidgetId === widgetId}
            isDropTarget={dropTargetId === widgetId}
            style={style}
            onDragStart={handleWidgetDragStart}
            onDragEnd={handleWidgetDragEnd}
            onDrop={handleWidgetDrop}
            onDragOver={handleWidgetDragOver}
            onResizeStart={handleResizeStart}
          >
            {renderWidget(widgetId)}
          </DashboardWidgetShell>
        );
      })}
    </div>
  );
}
