import { DashboardScene } from "../components/dashboard/DashboardScene";
import { DashboardWidgetGrid } from "../components/dashboard/DashboardWidgetGrid";
import { useSettings } from "../../settings/context/SettingsContext";
import "../../../styles/dashboard.scss";

export default function Dashboard() {
  const { settings } = useSettings();

  return (
    <DashboardScene>
      {({ renderWidget }) => (
        <div className="dashboard-layout-shell">
          <DashboardWidgetGrid
            widgets={settings.dashboard.widgets}
            renderWidget={renderWidget}
          />
        </div>
      )}
    </DashboardScene>
  );
}
