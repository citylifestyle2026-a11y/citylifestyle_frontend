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
import CreateGuestModal from "../Components/CreateGuestModal";

import { getAllGuests, deleteGuest } from "../redux/guest/guestThunk";
import { clearGuestState } from "../redux/guest/guestSlice";

import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/GuestList.css";

// PARV CRM — Phase 1: Master Guest Database list. Follows the same
// list-page shape as Pages/ContactList.jsx (Common* components,
// debounced search, server-side sort/pagination, one create/edit modal).

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

const CATEGORY_OPTIONS = [
  "HNI",
  "Entrepreneur",
  "Creator",
  "Business Leader",
  "Professional",
  "Artist",
  "Influencer",
  "Other",
].map((cat) => ({ value: cat, label: cat }));

// Only these fields are sortable server-side (see SORTABLE_FIELDS in
// services/guest.service.js).
const SORTABLE_COLUMNS = ["fullName", "mobile", "category", "city"];

export default function GuestList() {
  const dispatch = useDispatch();

  const { guests, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.guest
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteGuestId, setDeleteGuestId] = useState(null);
  const [deleteGuestName, setDeleteGuestName] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedGuest, setSelectedGuest] = useState(null);

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
    if (categoryFilter) params.category = categoryFilter;

    dispatch(getAllGuests(params));
  }, [dispatch, currentPage, rowsPerPage, search, sortBy, sortOrder, categoryFilter]);

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

  const handleToggleActionMenu = useCallback((guestId) => {
    setOpenActionMenuId((prev) => (prev === guestId ? null : guestId));
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
    setSelectedGuest(null);
    setFormModalMode("create");
    setIsFormModalOpen(true);
  };

  const handleEditClick = useCallback((guest) => {
    setOpenActionMenuId(null);
    setSelectedGuest(guest);
    setFormModalMode("edit");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedGuest(null);
    setFormModalMode("create");
  };

  const handleDeleteClick = useCallback((guest) => {
    setDeleteGuestId(guest._id);
    setDeleteGuestName(guest.fullName);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteGuestId(null);
    setDeleteGuestName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteGuest(deleteGuestId)).unwrap();
      showSuccess(res.message || "Guest deleted successfully");

      const params = { page: currentPage, limit: rowsPerPage, search, sortBy, sortOrder };
      if (categoryFilter) params.category = categoryFilter;
      dispatch(getAllGuests(params));

      dispatch(clearGuestState());
      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete guest");
    }
  };

  const renderSortableHeader = useCallback(
    (label, field) => (
      <span
        className="guestPage__sortHeader"
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
          className={`guestPage__sortIcon ${sortBy === field ? "guestPage__sortIconActive" : ""}`}
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

  const guestTableColumns = [
    sortableColumn("fullName", "Full Name", {
      cellClassName: "guestPage__guestName",
      render: (guest) => (
        <span>
          {guest.fullName || "-"}
          {guest.isVip && <span className="guestPage__vipBadge">VIP</span>}
        </span>
      ),
    }),
    sortableColumn("mobile", "Mobile", { render: (guest) => guest.mobile || "-" }),
    { key: "email", label: "Email", sortable: false, render: (guest) => guest.email || "-" },
    sortableColumn("category", "Category", { render: (guest) => guest.category || "-" }),
    sortableColumn("city", "City", { render: (guest) => guest.city || "-" }),
    {
      key: "relationship",
      label: "Relationship",
      sortable: false,
      render: (guest) => guest.relationship || "-",
    },
    {
      key: "action",
      label: "Actions",
      sortable: false,
      cellStyle: { position: "relative" },
      render: (guest) => (
        <div
          className="guestAction__wrapper"
          ref={openActionMenuId === guest._id ? actionMenuRef : null}
        >
          <button
            type="button"
            className="guestAction__button"
            onClick={() => handleToggleActionMenu(guest._id)}
          >
            Action
            <FaChevronDown className="guestAction__icon" />
          </button>

          <div
            className={`guestAction__menu ${
              openActionMenuId === guest._id ? "guestAction__menuOpen" : ""
            }`}
          >
            <button
              type="button"
              className="guestAction__item guestAction__itemEdit"
              onClick={() => handleEditClick(guest)}
            >
              Edit
            </button>
            <button
              type="button"
              className="guestAction__item guestAction__itemDelete"
              onClick={() => handleDeleteClick(guest)}
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
      pageClassName="guestPage__page"
      mainAreaClassName="guestPage__mainArea"
      contentClassName="guestPage__content"
      headerTitle="Guest List"
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
              <CreateGuestModal
                onClose={handleCloseFormModal}
                isEditMode={formModalMode === "edit"}
                editGuestData={selectedGuest}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                search={search}
                sortBy={sortBy}
                sortOrder={sortOrder}
                categoryFilter={categoryFilter}
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
                userName={deleteGuestName}
                entityLabel="guest"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="guestPage__topRow"
        title="Guest List"
        titleClassName="guestPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="guestPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span className="guestPage__breadcrumbActive">Guest List</span>
          </div>
        }
        actions={
          <div className="guestPage__headerActions">
            <button type="button" className="guestPage__createButton" onClick={handleCreateClick}>
              <FaPlus />
              Add Guest
            </button>
          </div>
        }
      />

      <div className="guestPage__tableCard">
        <div className="guestPage__tableControls">
          <CommonSelect
            className="guestPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="guestPage__searchBox"
            inputClassName="guestPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name, mobile, email, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />

          <CommonSelect
            className="guestPage__filterSelect"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Categories"
            options={CATEGORY_OPTIONS}
          />
        </div>

        <div className="guestPage__tableWrapper">
          <CommonTable
            columns={guestTableColumns}
            data={guests}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading guests..."
            error={error}
            errorMessage="Failed to load guests."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="guestPage__stateWrap"
                textClassName="guestPage__stateText"
                message="No guests found."
              />
            }
            tableClassName="guestPage__table"
            thContentClassName="guestPage__thContent"
            sortIconClassName="guestPage__sortIcon"
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
