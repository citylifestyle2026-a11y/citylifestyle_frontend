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
    <div className="dashboardLayout appPage">
      <Sidebar />

      <div className="dashboardMain appMain">
        <Header title={title} />
        <main className="dashboardContent appContent">{children}</main>
      </div>
    </div>
  );
}
