import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import "../assets/CSS/DashboardLayout.css";

/**
 * Shared shell for every dashboard page.
 * Renders the existing Sidebar + Header exactly as-is, and gives
 * page content a consistent content area (spacing + sidebar offset).
 *
 * NOTE: adjust the two import paths above to match where Sidebar.jsx
 * and Header.jsx actually live in your project — I don't have your
 * folder tree, so these are my best-guess paths based on the imports
 * inside those two files (../assets/CSS/...).import DashboardLayout from './DashboardLayout';

 */
export default function DashboardLayout({ title, children }) {
  return (
    <div className="dashboardLayout">
      <Sidebar />

      <div className="dashboardMain">
        <Header title={title} />
        <main className="dashboardContent">{children}</main>
      </div>
    </div>
  );
}
