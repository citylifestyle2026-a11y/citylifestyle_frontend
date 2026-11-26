import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import RunReport from "../Components/RunReport";

// Sidebar -> "Run Report": every Let's Run entry (all runs together), as three views:
//   Registered | Scanned | Registered, Not Scanned
import "../assets/CSS/CompanyCategory.css";

export default function RunReportPage() {
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
      />

      <div className="companyCategoryPage__tableCard appCard">
        <RunReport />
      </div>
    </CommonListLayout>
  );
}
