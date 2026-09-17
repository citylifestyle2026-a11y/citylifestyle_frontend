import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus, FaChevronDown } from "react-icons/fa";
import CommonTable from "../Components/CommonTable";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonListLayout from "../Components/CommonListLayout";
import EditAdminModal from "../Components/EditAdminModal";
import CreateAdminModal from "../Components/CreateAdminModal";
import DeleteUserModal from "../Components/DeleteUserModal";
import { getAllAdmins, deleteAdmin } from "../redux/admin/adminThunk";
import { clearAdminState } from "../redux/admin/adminSlice";
import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/Admin.css";

export default function Admin() {
  const dispatch = useDispatch();
  const { admins, loading, error } = useSelector((state) => state.admin);

  // Current logged-in admin's id. `profile` (from GET /auth/profile) is a
  // raw Mongo document → `_id`; the login-time `user` cached in
  // localStorage/state.auth.user uses `id` (see authService/auth.controller
  // response shape). Resolved field-by-field with fallbacks, same reasoning
  // as Sidebar.jsx/ProtectedRoute.jsx: either source alone could be
  // momentarily stale/missing depending on load order.
  const profile = useSelector((state) => state.auth.profile);
  const authUser = useSelector((state) => state.auth.user);
  const currentAdminId = profile?._id || profile?.id || authUser?.id || authUser?._id;

  // Same field-by-field resolution reasoning as currentAdminId above —
  // adminType is only used here to decide whether to show "Add Admin";
  // the real security boundary is still the backend's
  // authorize.requireSuperAdmin on POST /api/admin.
  const currentAdminType = profile?.adminType ?? authUser?.adminType;
  const isSuperAdmin = currentAdminType === "superadmin";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState(null);
  const [deleteAdminName, setDeleteAdminName] = useState("");

  // Tracks which row's Action dropdown is currently open — same pattern
  // as openActionMenuId in Pages/User.jsx.
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  useEffect(() => {
    dispatch(getAllAdmins());
  }, [dispatch]);

  // Ref for detecting outside clicks to close the action dropdown —
  // same pattern as actionMenuRef in Pages/User.jsx.
  const actionMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleActionMenu = useCallback((adminId) => {
    setOpenActionMenuId((prev) => (prev === adminId ? null : adminId));
  }, []);

  const handleEditClick = useCallback((admin) => {
    setSelectedAdmin(admin);
    setIsEditOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseModal = () => {
    setIsEditOpen(false);
    setSelectedAdmin(null);
  };

  const handleOpenCreate = useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
  };

  // Delete is only ever offered to the Super Admin, and never for their
  // own row (see adminTableColumns below) — this is purely the UX side;
  // the backend independently enforces both rules (authorize.requireSuperAdmin
  // + the self-delete guard in admin.service.js) regardless of what the
  // frontend shows.
  const handleDeleteClick = useCallback((admin) => {
    setDeleteAdminId(admin._id);
    setDeleteAdminName(admin.name);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteAdminId(null);
    setDeleteAdminName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteAdmin(deleteAdminId)).unwrap();

      showSuccess(res.message);

      // Belt-and-suspenders refetch, same pattern as User.jsx's delete
      // flow — the slice already removes the row in place too.
      dispatch(getAllAdmins());
      dispatch(clearAdminState());

      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete admin");
    }
  };

  // Column configuration passed to CommonTable, following the same
  // pattern as userTableColumns in Pages/User.jsx.
  const adminTableColumns = useMemo(() => [
    {
      key: "name",
      label: "Name",
      cellClassName: "adminPage__adminName",
      render: (admin) => (
        <span className="adminPage__nameCell">
          {admin.name}
          {String(admin._id) === String(currentAdminId) && (
            <span className="adminPage__youBadge">You</span>
          )}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (admin) => admin.email || "-",
    },
    {
      key: "mobile",
      label: "Mobile",
      render: (admin) => admin.mobile || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (admin) => (
        <span
          className={`adminPage__statusBadge ${
            admin.status === "inactive"
              ? "adminPage__statusInactive"
              : "adminPage__statusActive"
          }`}
        >
          {admin.status === "inactive" ? "Inactive" : "Active"}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: false,
      cellStyle: { position: "relative" },
      render: (admin) => {
        const isOwnRow = String(admin._id) === String(currentAdminId);

        // Edit is shown for the currently logged-in admin's own row, and
        // for EVERY row when the logged-in admin is the Super Admin (who
        // can edit any Admin). A normal Admin still only ever sees Edit
        // on their own row. The backend independently enforces the same
        // rule (PUT /api/admin/me for self, PUT /api/admin/:id gated by
        // authorize.requireSuperAdmin for any-admin edits), so this is a
        // UX convenience, not the actual security boundary.
        const canEdit = isSuperAdmin || isOwnRow;

        // Delete is Super-Admin-only, and never offered on the Super
        // Admin's own row (their account can't delete itself — the
        // backend's self-delete guard would reject it anyway, this just
        // avoids showing a button that would always fail).
        const canDelete = isSuperAdmin && !isOwnRow;

        if (!canEdit && !canDelete) {
          return <span className="adminPage__noAction">-</span>;
        }

        // Action dropdown — same structure/behavior as the userAction__
        // menu in Pages/User.jsx, scoped under the adminAction__ prefix.
        return (
          <div
            className="adminAction__wrapper"
            ref={openActionMenuId === admin._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="adminAction__button"
              onClick={() => handleToggleActionMenu(admin._id)}
            >
              Action
              <FaChevronDown className="adminAction__icon" />
            </button>

            <div
              className={`adminAction__menu ${
                openActionMenuId === admin._id ? "adminAction__menuOpen" : ""
              }`}
            >
              {canEdit && (
                <button
                  type="button"
                  className="adminAction__item adminAction__itemEdit"
                  onClick={() => handleEditClick(admin)}
                >
                  Edit
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  className="adminAction__item adminAction__itemDelete"
                  onClick={() => handleDeleteClick(admin)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      },
    },
  ], [currentAdminId, isSuperAdmin, openActionMenuId, handleToggleActionMenu, handleEditClick, handleDeleteClick]);

  return (
    <CommonListLayout
      pageClassName="adminPage__page"
      mainAreaClassName="adminPage__mainArea"
      contentClassName="adminPage__content"
      headerTitle="Admin"
      outsideMainArea={
        <>
          {isEditOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseModal();
                }
              }}
            >
              <EditAdminModal
                admin={selectedAdmin}
                onClose={handleCloseModal}
                isEditingSelf={String(selectedAdmin?._id) === String(currentAdminId)}
              />
            </div>
          )}

          {isCreateOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseCreate();
                }
              }}
            >
              <CreateAdminModal onClose={handleCloseCreate} />
            </div>
          )}

          {isDeleteOpen && (
            <DeleteUserModal
              userName={deleteAdminName}
              entityLabel="admin"
              onClose={handleCloseDeleteModal}
              onDelete={handleDeleteConfirm}
            />
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="adminPage__topRow"
        title="Admin"
        titleClassName="adminPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="adminPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span className="adminPage__breadcrumbActive">Admin</span>
          </div>
        }
        // Add Admin is only ever shown to the Super Admin — a Normal
        // Admin never sees this button. The backend independently
        // enforces the same restriction on POST /api/admin regardless.
        actions={
          isSuperAdmin ? (
            <button
              type="button"
              className="adminPage__createButton"
              onClick={handleOpenCreate}
            >
              <FaPlus />
              Add Admin
            </button>
          ) : undefined
        }
      />

      <div className="adminPage__tableCard">
        <div className="adminPage__tableWrapper">
          <CommonTable
            columns={adminTableColumns}
            data={admins}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading admins..."
            error={error}
            errorMessage="Failed to load admins."
            emptyMessage="No admins found."
            tableClassName="adminPage__table"
            thContentClassName="adminPage__thContent"
            sortIconClassName="adminPage__sortIcon"
          />
        </div>
      </div>
    </CommonListLayout>
  );
}