import { useEffect, useState } from "react";
import { FaSort, FaSearch } from "react-icons/fa";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import "../assets/CSS/Role.css";
import PermissionModal from "../Components/PermissionModal";
import { getRoleApi } from "../services/roleService";

const columns = ["Name", "Permissions"];

export default function Role() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [permissionModalRole, setPermissionModalRole] = useState(null);

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRole = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getRoleApi();
        if (isMounted) {
          setRole(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to fetch role");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const roleMatchesSearch =
    !!role && role.role.toLowerCase().includes(searchTerm.toLowerCase());

  const visibleRoles = roleMatchesSearch ? [role] : [];

  return (
    <div className="rolePage">
      <Sidebar />

      <div className="mainArea">
        <Header title="Role" />

        <div className="content">
          <div className="topRow">
            <div>
              <h1 className="pageRoleTitle">Role</h1>
              <div className="breadcrumb">
                <span>Dashboard</span>
                <span>-</span>
                <span className="active">Role</span>
              </div>
            </div>
          </div>

          <div className="tableCard">
            {/* <div className="tableControls">
              <select
                className="rowsSelect"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(e.target.value)}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>

              <div className="searchRoleBox">
                <FaSearch />
                <input
                  type="text"
                  className="searchRoleInput"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div> */}

            <div className="tableWrapper">
              <table className="roleTable">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>
                        <span className="thContent">
                          {col !== "Permissions" && <FaSort className="userPage__sortIcon" />}
                          {col}
                                                  </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length}>Loading...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={columns.length}>{error}</td>
                    </tr>
                  ) : visibleRoles.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length}>No Role Found</td>
                    </tr>
                  ) : (
                    visibleRoles.map((r) => (
                      <tr key={r.role}>
                        <td className="roleName">{r.role}</td>
                        <td>
                          <span
                            className="permissionLink"
                            onClick={() => setPermissionModalRole(r)}
                          >
                            {r.permissions.length} Permission
                            {r.permissions.length !== 1 ? "s" : ""}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="tableFooter">
              Show {visibleRoles.length > 0 ? "1 - 1" : "0"} of {role ? 1 : 0}
            </div>
          </div>
        </div>
      </div>

      {permissionModalRole && (
        <div
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setPermissionModalRole(null);
            }
          }}
        >
          <PermissionModal
            role={permissionModalRole}
            onClose={() => setPermissionModalRole(null)}
          />
        </div>
      )}
    </div>
  );
}