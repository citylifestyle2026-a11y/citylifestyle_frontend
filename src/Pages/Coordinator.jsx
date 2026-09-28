import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaSearch, FaPlus, FaChevronDown } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import CreateCoordinatorModal from "../Components/CreateCoordinatorModal";

import { getAllCoordinators, deleteCoordinator } from "../redux/coordinator/coordinatorThunk";
import { clearCoordinatorState } from "../redux/coordinator/coordinatorSlice";

import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/CoordinatorList.css";

// PARV CRM — Phase 2: Coordinator account management list. Admin-only,
// same list-page shape as Pages/GuestList.jsx. No sort/filter params —
// coordinator.service.js (backend) only supports ?search=&page=&limit=.

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

export default function Coordinator() {
  const dispatch = useDispatch();

  const { coordinators, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.coordinator
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteCoordinatorId, setDeleteCoordinatorId] = useState(null);
  const [deleteCoordinatorName, setDeleteCoordinatorName] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedCoordinator, setSelectedCoordinator] = useState(null);

  const effectiveLimit = limit || rowsPerPage;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * effectiveLimit;
  const endIndex = Math.min(currentPage * effectiveLimit, total);
  const resolvedTotalPages = totalPages || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(getAllCoordinators({ page: currentPage, limit: rowsPerPage, search }));
  }, [dispatch, currentPage, rowsPerPage, search]);

  const actionMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleActionMenu = useCallback((coordinatorId) => {
    setOpenActionMenuId((prev) => (prev === coordinatorId ? null : coordinatorId));
  }, []);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < resolvedTotalPages) setCurrentPage(currentPage + 1);
  };

  const handleCreateClick = () => {
    setSelectedCoordinator(null);
    setFormModalMode("create");
    setIsFormModalOpen(true);
  };

  const handleEditClick = useCallback((coordinator) => {
    setOpenActionMenuId(null);
    setSelectedCoordinator(coordinator);
    setFormModalMode("edit");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedCoordinator(null);
    setFormModalMode("create");
  };

  const handleDeleteClick = useCallback((coordinator) => {
    setDeleteCoordinatorId(coordinator._id);
    setDeleteCoordinatorName(coordinator.name);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteCoordinatorId(null);
    setDeleteCoordinatorName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteCoordinator(deleteCoordinatorId)).unwrap();
      showSuccess(res.message || "Coordinator deleted successfully");

      dispatch(getAllCoordinators({ page: currentPage, limit: rowsPerPage, search }));

      dispatch(clearCoordinatorState());
      handleCloseDeleteModal();
    } catch (err) {
      showError(getErrorText(err, "Failed to delete coordinator"));
    }
  };

  const coordinatorTableColumns = [
    {
      key: "name",
      label: "Name",
      sortable: false,
      cellClassName: "coordinatorPage__contactName",
      render: (coordinator) => coordinator.name || "-",
    },
    {
      key: "mobile",
      label: "Mobile",
      sortable: false,
      render: (coordinator) => coordinator.mobile || "-",
    },
    {
      key: "email",
      label: "Email",
      sortable: false,
      render: (coordinator) => coordinator.email || "-",
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (coordinator) => (
        <span
          className={`coordinatorPage__statusBadge coordinatorPage__status--${coordinator.status}`}
        >
          {coordinator.status}
        </span>
      ),
    },
    {
      key: "createdBy",
      label: "Created By",
      sortable: false,
      render: (coordinator) => coordinator.createdBy?.name || "-",
    },
    {
      key: "action",
      label: "Actions",
      sortable: false,
      cellStyle: { position: "relative" },
      render: (coordinator) => (
        <div
          className="coordinatorAction__wrapper"
          ref={openActionMenuId === coordinator._id ? actionMenuRef : null}
        >
          <button
            type="button"
            className="coordinatorAction__button"
            onClick={() => handleToggleActionMenu(coordinator._id)}
          >
            Action
            <FaChevronDown className="coordinatorAction__icon" />
          </button>

          <div
            className={`coordinatorAction__menu ${
              openActionMenuId === coordinator._id ? "coordinatorAction__menuOpen" : ""
            }`}
          >
            <button
              type="button"
              className="coordinatorAction__item coordinatorAction__itemEdit"
              onClick={() => handleEditClick(coordinator)}
            >
              Edit
            </button>
            <button
              type="button"
              className="coordinatorAction__item coordinatorAction__itemDelete"
              onClick={() => handleDeleteClick(coordinator)}
            >
              Delete
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <CommonListLayout
      pageClassName="coordinatorPage__page"
      mainAreaClassName="coordinatorPage__mainArea"
      contentClassName="coordinatorPage__content"
      headerTitle="Coordinators"
      outsideMainArea={
        <>
          {isFormModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCloseFormModal();
              }}
            >
              <CreateCoordinatorModal
                onClose={handleCloseFormModal}
                isEditMode={formModalMode === "edit"}
                editCoordinatorData={selectedCoordinator}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                search={search}
              />
            </div>
          )}

          {isDeleteOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCloseDeleteModal();
              }}
            >
              <DeleteUserModal
                userName={deleteCoordinatorName}
                entityLabel="coordinator"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="coordinatorPage__topRow"
        title="Coordinators"
        titleClassName="coordinatorPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="coordinatorPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="coordinatorPage__breadcrumbActive">Coordinators</span>
          </div>
        }
        actions={
          <div className="coordinatorPage__headerActions">
            <button type="button" className="coordinatorPage__createButton" onClick={handleCreateClick}>
              <FaPlus />
              Add Coordinator
            </button>
          </div>
        }
      />

      <div className="coordinatorPage__tableCard appCard">
        <div className="coordinatorPage__tableControls">
          <CommonSelect
            className="coordinatorPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="coordinatorPage__searchBox"
            inputClassName="coordinatorPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name, mobile, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </div>

        <div className="coordinatorPage__tableWrapper">
          <CommonTable
            columns={coordinatorTableColumns}
            data={coordinators}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading coordinators..."
            error={error}
            errorMessage="Failed to load coordinators."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="coordinatorPage__stateWrap"
                textClassName="coordinatorPage__stateText"
                message="No coordinators found."
              />
            }
            tableClassName="coordinatorPage__table"
            thContentClassName="coordinatorPage__thContent"
            sortIconClassName="coordinatorPage__sortIcon"
          />
        </div>

        <CommonPagination
          currentPage={currentPage}
          totalPages={resolvedTotalPages}
          rangeStart={total === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={total}
          showControls={total > rowsPerPage}
          onPageSelect={(page) => setCurrentPage(page)}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === resolvedTotalPages}
        />
      </div>
    </CommonListLayout>
  );
}
