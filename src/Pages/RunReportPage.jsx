import { Link } from "react-router-dom";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import RunReport from "../Components/RunReport";
import { useGlobalEvent } from "../context/EventContext";

// Sidebar -> "Run Report": the Let's Run people of the event picked in the
// header dropdown (default = the active event), as three views:
//   Registered | Registered, Not Scanned | Scanned
import "../assets/CSS/CompanyCategory.css";

export default function RunReportPage() {
  const { effectiveEventId } = useGlobalEvent();

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Run Report"
    >
      <CommonPageHeader
        containerClassName="companyCategoryPage__topRow"
        title="Run Report"
        titleClassName="companyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="companyCategoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="companyCategoryPage__breadcrumbActive">Run Report</span>
          </div>
        }
      />

      <div className="companyCategoryPage__tableCard appCard">
        <RunReport eventId={effectiveEventId} />
      </div>
    </CommonListLayout>
  );
}
