import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaSearch, FaPlus, FaChevronDown, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import CreateEditionModal from "../Components/CreateEditionModal";

import { getAllEditions, deleteEdition } from "../redux/edition/editionThunk";
import { clearEditionState } from "../redux/edition/editionSlice";

import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/EditionList.css";

// PARV CRM — Phase 1: Edition (PARV 1, PARV 2...) management list. Same
// list-page shape as Pages/GuestList.jsx / Pages/ContactList.jsx.

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

const STATUS_OPTIONS = ["Draft", "Active", "Closed", "Archived"].map((status) => ({
  value: status,
  label: status,
}));

// Only these fields are sortable server-side (see SORTABLE_FIELDS in
// services/edition.service.js).
const SORTABLE_COLUMNS = ["editionNumber", "year", "name", "status"];

export default function EditionList() {
  const dispatch = useDispatch();

  const { editions, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.edition
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [sortBy, setSortBy] = useState("editionNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteEditionId, setDeleteEditionId] = useState(null);
  const [deleteEditionName, setDeleteEditionName] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedEdition, setSelectedEdition] = useState(null);

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
    const params = { page: currentPage, limit: rowsPerPage, search, sortBy, sortOrder };
    if (statusFilter) params.status = statusFilter;

    dispatch(getAllEditions(params));
  }, [dispatch, currentPage, rowsPerPage, search, sortBy, sortOrder, statusFilter]);

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

  const handleToggleActionMenu = useCallback((editionId) => {
    setOpenActionMenuId((prev) => (prev === editionId ? null : editionId));
  }, []);

  const handleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortOrder("asc");
      return field;
    });
    setCurrentPage(1);
  }, []);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < resolvedTotalPages) setCurrentPage(currentPage + 1);
  };

  const handleCreateClick = () => {
    setSelectedEdition(null);
    setFormModalMode("create");
    setIsFormModalOpen(true);
  };

  const handleEditClick = useCallback((edition) => {
    setOpenActionMenuId(null);
    setSelectedEdition(edition);
    setFormModalMode("edit");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedEdition(null);
    setFormModalMode("create");
  };

  const handleDeleteClick = useCallback((edition) => {
    setDeleteEditionId(edition._id);
    setDeleteEditionName(edition.name);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteEditionId(null);
    setDeleteEditionName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteEdition(deleteEditionId)).unwrap();
      showSuccess(res.message || "Edition deleted successfully");

      const params = { page: currentPage, limit: rowsPerPage, search, sortBy, sortOrder };
      if (statusFilter) params.status = statusFilter;
      dispatch(getAllEditions(params));

      dispatch(clearEditionState());
      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete edition");
    }
  };

  const renderSortableHeader = useCallback(
    (label, field) => (
      <span
        className="editionPage__sortHeader"
        role="button"
        tabIndex={0}
        aria-label={`Sort by ${label}`}
        onClick={() => handleSort(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
      >
        <span
          className={`editionPage__sortIcon ${
            sortBy === field ? "editionPage__sortIconActive" : ""
          }`}
        >
          {sortBy === field ? (
            sortOrder === "asc" ? (
              <FaSortUp />
            ) : (
              <FaSortDown />
            )
          ) : (
            <FaSort />
          )}
        </span>
        {label}
      </span>
    ),
    [sortBy, sortOrder, handleSort]
  );

  const sortableColumn = (key, label, extra = {}) => {
    const isSortable = SORTABLE_COLUMNS.includes(key);
    return {
      key,
      label: isSortable ? renderSortableHeader(label, key) : label,
      ...(isSortable ? { sortable: false } : {}),
      ...extra,
    };
  };

  const editionTableColumns = [
    sortableColumn("editionNumber", "Edition #", {
      cellClassName: "editionPage__editionNumber",
      render: (edition) => edition.editionNumber ?? "-",
    }),
    sortableColumn("name", "Name", { render: (edition) => edition.name || "-" }),
    sortableColumn("year", "Year", { render: (edition) => edition.year ?? "-" }),
    {
      key: "eventDateTime",
      label: "Event Date",
      sortable: false,
      render: (edition) =>
        edition.eventDateTime ? new Date(edition.eventDateTime).toLocaleString() : "-",
    },
    { key: "venue", label: "Venue", sortable: false, render: (edition) => edition.venue || "-" },
    {
      key: "guestCapacity",
      label: "Capacity",
      sortable: false,
      render: (edition) => edition.guestCapacity ?? "-",
    },
    sortableColumn("status", "Status", {
      render: (edition) => (
        <span className={`editionPage__statusBadge editionPage__status--${edition.status}`}>
          {edition.status}
        </span>
      ),
    }),
    {
      key: "action",
      label: "Actions",
      sortable: false,
      cellStyle: { position: "relative" },
      render: (edition) => (
        <div
          className="editionAction__wrapper"
          ref={openActionMenuId === edition._id ? actionMenuRef : null}
        >
          <button
            type="button"
            className="editionAction__button"
            onClick={() => handleToggleActionMenu(edition._id)}
          >
            Action
            <FaChevronDown className="editionAction__icon" />
          </button>

          <div
            className={`editionAction__menu ${
              openActionMenuId === edition._id ? "editionAction__menuOpen" : ""
            }`}
          >
            <button
              type="button"
              className="editionAction__item editionAction__itemEdit"
              onClick={() => handleEditClick(edition)}
            >
              Edit
            </button>
            <button
              type="button"
              className="editionAction__item editionAction__itemDelete"
              onClick={() => handleDeleteClick(edition)}
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
      pageClassName="editionPage__page"
      mainAreaClassName="editionPage__mainArea"
      contentClassName="editionPage__content"
      headerTitle="Edition List"
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
              <CreateEditionModal
                onClose={handleCloseFormModal}
                isEditMode={formModalMode === "edit"}
                editEditionData={selectedEdition}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                search={search}
                sortBy={sortBy}
                sortOrder={sortOrder}
                statusFilter={statusFilter}
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
                userName={deleteEditionName}
                entityLabel="edition"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="editionPage__topRow"
        title="Edition List"
        titleClassName="editionPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="editionPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span className="editionPage__breadcrumbActive">Edition List</span>
          </div>
        }
        actions={
          <div className="editionPage__headerActions">
            <button
              type="button"
              className="editionPage__createButton"
              onClick={handleCreateClick}
            >
              <FaPlus />
              Add Edition
            </button>
          </div>
        }
      />

      <div className="editionPage__tableCard">
        <div className="editionPage__tableControls">
          <CommonSelect
            className="editionPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="editionPage__searchBox"
            inputClassName="editionPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name, venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />

          <CommonSelect
            className="editionPage__filterSelect"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Statuses"
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="editionPage__tableWrapper">
          <CommonTable
            columns={editionTableColumns}
            data={editions}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading editions..."
            error={error}
            errorMessage="Failed to load editions."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="editionPage__stateWrap"
                textClassName="editionPage__stateText"
                message="No editions found."
              />
            }
            tableClassName="editionPage__table"
            thContentClassName="editionPage__thContent"
            sortIconClassName="editionPage__sortIcon"
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
