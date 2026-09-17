import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaSearch,
  FaPlus,
  FaChevronDown,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import CreateCompanyCategoryModal from "../Components/CreateCompanyCategoryModal";

import {
  getAllCompanyCategories,
  deleteCompanyCategory,
} from "../redux/companyCategory/companyCategoryThunk";
import { clearCompanyCategoryState } from "../redux/companyCategory/companyCategorySlice";

import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/CompanyCategory.css";

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific
// options — same as ROWS_PER_PAGE_OPTIONS in Pages/User.jsx/ContactList.jsx.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

// Only these fields are sortable server-side (see SORTABLE_FIELDS in
// services/companycategory.service.js). Columns outside this list render
// a plain, non-interactive header rather than a sort affordance that the
// API would silently ignore and fall back to `createdAt` for.
const SORTABLE_COLUMNS = ["name", "createdAt"];

export default function CompanyCategory() {
  const dispatch = useDispatch();

  const {
    companyCategories,
    loading,
    error,
    total,
    totalPages,
    limit,
  } = useSelector((state) => state.companyCategory);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // searchTerm tracks the raw input value; search is the debounced value
  // actually sent to the API — same pattern as User.jsx/ContactList.jsx.
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  // Sorting. Defaults mirror the backend's own defaults so the first
  // render and the API agree without sending redundant params.
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Tracks which row's Action dropdown is currently open.
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Delete modal state.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [deleteCategoryName, setDeleteCategoryName] = useState("");

  // Create/Edit modal state — a single modal instance handles both modes
  // (see CreateCompanyCategoryModal's own isEditMode prop), same pattern
  // as CreateContactModal.jsx.
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const effectiveLimit = limit || rowsPerPage;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * effectiveLimit;
  const endIndex = Math.min(currentPage * effectiveLimit, total);
  const resolvedTotalPages = totalPages || 1;

  // Debounce the search input before it affects the API call / page reset.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch company categories.
  useEffect(() => {
    dispatch(
      getAllCompanyCategories({
        page: currentPage,
        limit: rowsPerPage,
        search,
        sortBy,
        sortOrder,
      })
    );
  }, [dispatch, currentPage, rowsPerPage, search, sortBy, sortOrder]);

  // Ref for detecting outside clicks to close the action dropdown —
  // same pattern as actionMenuRef in Pages/User.jsx/ContactList.jsx.
  const actionMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleActionMenu = useCallback((categoryId) => {
    setOpenActionMenuId((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  // Clicking the same column flips direction; clicking a new column starts
  // it ascending. Either way the list returns to page 1, since row 1 of the
  // new ordering is almost never on the page the admin was already on.
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
    setSelectedCategory(null);
    setFormModalMode("create");
    setIsFormModalOpen(true);
  };

  const handleEditClick = useCallback((category) => {
    setOpenActionMenuId(null);
    setSelectedCategory(category);
    setFormModalMode("edit");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedCategory(null);
    setFormModalMode("create");
  };

  const handleDeleteClick = useCallback((category) => {
    setDeleteCategoryId(category._id);
    setDeleteCategoryName(category.name);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteCategoryId(null);
    setDeleteCategoryName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(
        deleteCompanyCategory(deleteCategoryId)
      ).unwrap();

      showSuccess(res.message || "Company Category deleted successfully");

      // Refetch using the list's CURRENT page/limit/search/sort rather
      // than resetting them, so a delete doesn't yank the admin back to
      // page 1 — same reasoning as ContactList.jsx's delete flow.
      dispatch(
        getAllCompanyCategories({
          page: currentPage,
          limit: rowsPerPage,
          search,
          sortBy,
          sortOrder,
        })
      );

      dispatch(clearCompanyCategoryState());

      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete company category");
    }
  };

  // ---------- Columns ----------

  // Builds a clickable header for a server-sortable column. Passed as the
  // column's `label` (with `sortable: false`) so CommonTable's own static
  // sort icon isn't rendered on top of this interactive one — CommonTable
  // itself stays untouched.
  const renderSortableHeader = useCallback(
    (label, field) => (
      <span
        className="companyCategoryPage__sortHeader"
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
          className={`companyCategoryPage__sortIcon ${
            sortBy === field ? "companyCategoryPage__sortIconActive" : ""
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

  const categoryTableColumns = useMemo(() => {
    const sortableColumn = (key, label, extra = {}) => ({
      key,
      label: SORTABLE_COLUMNS.includes(key)
        ? renderSortableHeader(label, key)
        : label,
      sortable: false,
      ...extra,
    });

    return [
      sortableColumn("name", "Name", {
        cellClassName: "companyCategoryPage__categoryName",
        render: (category) => category.name || "-",
      }),
      sortableColumn("description", "Description", {
        cellClassName: "companyCategoryPage__descriptionCell",
        render: (category) => category.description || "-",
      }),
      sortableColumn("createdAt", "Created", {
        render: (category) =>
          category.createdAt
            ? new Date(category.createdAt).toLocaleDateString()
            : "-",
      }),
      {
        key: "action",
        label: "Actions",
        sortable: false,
        cellStyle: { position: "relative" },
        render: (category) => (
          <div
            className="companyCategoryAction__wrapper"
            ref={openActionMenuId === category._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="companyCategoryAction__button"
              onClick={() => handleToggleActionMenu(category._id)}
            >
              Action
              <FaChevronDown className="companyCategoryAction__icon" />
            </button>

            <div
              className={`companyCategoryAction__menu ${
                openActionMenuId === category._id
                  ? "companyCategoryAction__menuOpen"
                  : ""
              }`}
            >
              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleEditClick(category)}
              >
                Edit
              </button>

              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleDeleteClick(category)}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ];
  }, [
    renderSortableHeader,
    openActionMenuId,
    handleToggleActionMenu,
    handleEditClick,
    handleDeleteClick,
  ]);

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Company Category"
      outsideMainArea={
        <>
          {isFormModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseFormModal();
                }
              }}
            >
              <CreateCompanyCategoryModal
                onClose={handleCloseFormModal}
                isEditMode={formModalMode === "edit"}
                editCategoryData={selectedCategory}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                search={search}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
            </div>
          )}

          {isDeleteOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseDeleteModal();
                }
              }}
            >
              <DeleteUserModal
                userName={deleteCategoryName}
                entityLabel="company category"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="companyCategoryPage__topRow"
        title="Company Category"
        titleClassName="companyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="companyCategoryPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span className="companyCategoryPage__breadcrumbActive">
              Company Category
            </span>
          </div>
        }
        actions={
          <button
            type="button"
            className="companyCategoryPage__createButton"
            onClick={handleCreateClick}
          >
            <FaPlus />
            Create Category
          </button>
        }
      />

      <div className="companyCategoryPage__tableCard">
        <div className="companyCategoryPage__tableControls">
          <CommonSelect
            className="companyCategoryPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="companyCategoryPage__searchBox"
            inputClassName="companyCategoryPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
          />
        </div>

        <div className="companyCategoryPage__tableWrapper">
          <CommonTable
            columns={categoryTableColumns}
            data={companyCategories}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading company categories..."
            error={error}
            errorMessage="Failed to load company categories."
            emptyMessage="No company categories found."
            tableClassName="companyCategoryPage__table"
            thContentClassName="companyCategoryPage__thContent"
            sortIconClassName="companyCategoryPage__sortIcon"
          />
        </div>

        {/* pagination */}
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