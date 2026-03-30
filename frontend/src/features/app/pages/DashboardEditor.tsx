import { DashboardScene } from "../components/dashboard/DashboardScene";
import { DashboardEditorContent } from "../components/dashboard/DashboardEditorContent";
import "../../../styles/dashboard.scss";

export default function DashboardEditor() {
  return (
    <DashboardScene showOverlays={false}>
      {({ renderWidget }) => (
        <DashboardEditorContent renderWidget={renderWidget} showStandaloneLinks />
      )}
    </DashboardScene>
  );
}
