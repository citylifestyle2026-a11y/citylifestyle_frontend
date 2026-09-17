import { useState } from "react";
import { FaSort, FaSearch, FaChevronDown, FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import CreatePermissionModal from "../Components/CreatePermissionModal";
import DeletePermissionModal from "../Components/DeletePermissionModal";
import "../assets/CSS/Permission.css";


const baseNames = [
  "delete user",
  "update user",
  "read user",
  "create user",
  "delete role",
  "update role",
  "read role",
  "create role",
  "delete permission",
  "update permission",
];

const permissionsData = Array.from({ length: 32 }, (_, index) => ({
  id: index + 1,
  name: baseNames[index % baseNames.length],
  guard: "web",
  created: "26-06-2024 07:20 am",
  updated: "26-06-2024 07:20 am",
}));

const columns = ["Name", "Guard", "Created", "Updated"];

export default function Permission() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [openActionId, setOpenActionId] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const pageSize = Number(rowsPerPage);

  const searchedPermissions = permissionsData.filter((permission) =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntries = searchedPermissions.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeActivePage = Math.min(activePage, totalPages);

  const startIndex = (safeActivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);

  const filteredPermissions = searchedPermissions.slice(startIndex, endIndex);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const toggleActionMenu = (id) => {
    setOpenActionId((prev) => (prev === id ? null : id));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setActivePage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setActivePage(1);
  };

  const handleEditClick = (permission) => {
    setSelectedPermission(permission);
    setIsEditMode(true);
    setIsCreateModalOpen(true);
    setOpenActionId(null);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditMode(false);
    setSelectedPermission(null);
  };

  const handleDeleteClick = (permission) => {
    setDeleteTarget(permission);
    setOpenActionId(null);
  };

  const handleDeleteConfirm = () => {
    // delete logic goes here
    setDeleteTarget(null);
  };

  const goToPreviousPage = () => {
    setActivePage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setActivePage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="permissionPageWrapper">
      <Sidebar />

      <div className="permissionPageMainArea">
        <Header title="Permission" />

        <div className="permissionPageContent">
          <div className="permissionPageTopRow">
            <div>
              <h1 className="permissionPageTitle">Permission</h1>
              <div className="permissionPageBreadcrumb">
                <span>Dashboard</span>
                <span>-</span>
                <span className="permissionPageBreadcrumbActive">Permission</span>
              </div>
            </div>

            <button
              type="button"
              className="permissionPageCreateButton"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <FaPlus />
              Create Permission
            </button>
          </div>

          <div className="permissionPageTableCard">
            {openActionId !== null && (
              <div
                className="permissionPageActionOverlay"
                onClick={() => setOpenActionId(null)}
              />
            )}

            <div className="permissionPageTableControls">
              <select
                className="permissionPageRowsSelect"
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(e.target.value)}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>

              <div className="permissionPageSearchBox">
                <FaSearch />
                <input
                  type="text"
                  className="permissionPageSearchInput"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="permissionPageTableWrapper">
              <table className="permissionPageTable">
                <thead>
                  <tr>
                    <th className="permissionPageCheckboxCell">
                      <input type="checkbox" className="permissionPageRowCheckbox" />
                    </th>
                    {columns.map((col) => (
                      <th key={col}>
                        <span className="permissionPageThContent">
                          {col}
                          <FaSort className="permissionPageSortIcon" />
                        </span>
                      </th>
                    ))}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id}>
                      <td>
                        <input type="checkbox" className="permissionPageRowCheckbox" />
                      </td>
                      <td className="permissionPageName">{permission.name}</td>
                      <td>{permission.guard}</td>
                      <td>{permission.created}</td>
                      <td>{permission.updated}</td>
                      <td className="permissionPageActionCell">
                        <button
                          type="button"
                          className={`permissionPageActionButton ${
                            openActionId === permission.id ? "permissionPageActionButtonOpen" : ""
                          }`}
                          onClick={() => toggleActionMenu(permission.id)}
                        >
                          Action
                          <FaChevronDown />
                        </button>

                        {openActionId === permission.id && (
                          <div className="permissionPageActionMenu">
                            <button
                              type="button"
                              className="permissionPageActionMenuItem"
                              onClick={() => handleEditClick(permission)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="permissionPageActionMenuItem"
                              onClick={() => handleDeleteClick(permission)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="permissionPagePagination">
              <span className="permissionPagePaginationInfo">
                Show {totalEntries === 0 ? 0 : startIndex + 1} - {endIndex} of {totalEntries}
              </span>

              <div className="permissionPagePaginationControls">
                <button
                  type="button"
                  className="permissionPagePaginationArrow"
                  onClick={goToPreviousPage}
                  disabled={safeActivePage === 1}
                  aria-label="Previous page"
                >
                  <FaChevronLeft />
                </button>

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`permissionPagePaginationBtn ${
                      safeActivePage === page ? "permissionPagePaginationActive" : ""
                    }`}
                    onClick={() => setActivePage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="permissionPagePaginationArrow"
                  onClick={goToNextPage}
                  disabled={safeActivePage === totalPages}
                  aria-label="Next page"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreatePermissionModal
          onClose={handleCreateModalClose}
          isEditMode={isEditMode}
          selectedPermission={selectedPermission}
        />
      )}

      {deleteTarget && (
        <DeletePermissionModal
          permissionName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
