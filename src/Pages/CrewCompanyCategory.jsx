import { Link } from "react-router-dom";
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
import { formatDate } from "../utilits/dateFormat";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import CreateCrewCompanyCategoryModal from "../Components/CreateCrewCompanyCategoryModal";

import {
  getAllCrewCompanyCategories,
  deleteCrewCompanyCategory,
} from "../redux/crewCompanyCategory/crewCompanyCategoryThunk";
import { clearCrewCompanyCategoryState } from "../redux/crewCompanyCategory/crewCompanyCategorySlice";

import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/CrewCompanyCategory.css";
import useClickOutside from "../hooks/useClickOutside";
import { ALL_ROWS_OPTION } from "../utilits/rowsPerPage";

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific
// options — same as ROWS_PER_PAGE_OPTIONS in Pages/User.jsx/ContactList.jsx.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));
ROWS_PER_PAGE_OPTIONS.push(ALL_ROWS_OPTION);

// Only these fields are sortable server-side (see SORTABLE_FIELDS in
// services/crewcompanycategory.service.js). Columns outside this list render
// a plain, non-interactive header rather than a sort affordance that the
// API would silently ignore and fall back to `createdAt` for.
const SORTABLE_COLUMNS = ["name", "createdAt"];

export default function CrewCompanyCategory() {
  const dispatch = useDispatch();

  const {
    crewCompanyCategories,
    loading,
    listError,
    total,
    totalPages,
    limit,
  } = useSelector((state) => state.crewCompanyCategory);

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
  // (see CreateCrewCompanyCategoryModal's own isEditMode prop), same pattern
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

  // Fetch crew company categories.
  useEffect(() => {
    dispatch(
      getAllCrewCompanyCategories({
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
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

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
        deleteCrewCompanyCategory(deleteCategoryId)
      ).unwrap();

      showSuccess(res.message || "Crew Company Category deleted successfully");

      // Refetch using the list's CURRENT page/limit/search/sort rather
      // than resetting them, so a delete doesn't yank the admin back to
      // page 1 — same reasoning as ContactList.jsx's delete flow.
      dispatch(
        getAllCrewCompanyCategories({
          page: currentPage,
          limit: rowsPerPage,
          search,
          sortBy,
          sortOrder,
        })
      );

      dispatch(clearCrewCompanyCategoryState());

      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete crew company category");
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
        className="crewCompanyCategoryPage__sortHeader"
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
          className={`crewCompanyCategoryPage__sortIcon ${
            sortBy === field ? "crewCompanyCategoryPage__sortIconActive" : ""
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
    // Only name/createdAt (SORTABLE_COLUMNS) are actually clickable —
    // those keep their own custom header (icon + label, wired to
    // handleSort) and are marked `sortable: false` so CommonTable
    // doesn't stack a second icon on top of that one. Every other
    // column (Description) is left at CommonTable's default (sortable
    // left unset), so CommonTable renders its own built-in, static
    // FaSort icon in front of the label — same "icon before every
    // column" look as Entry Report / Contact List, even though
    // clicking it does nothing for this non-sortable column.
    const sortableColumn = (key, label, extra = {}) => {
      const isSortable = SORTABLE_COLUMNS.includes(key);
      return {
        key,
        label: isSortable ? renderSortableHeader(label, key) : label,
        ...(isSortable ? { sortable: false } : {}),
        ...extra,
      };
    };

    return [
      sortableColumn("name", "Name", {
        cellClassName: "crewCompanyCategoryPage__categoryName",
        render: (category) => category.name || "-",
      }),
      sortableColumn("description", "Description", {
        cellClassName: "crewCompanyCategoryPage__descriptionCell",
        render: (category) => category.description || "-",
      }),
      sortableColumn("createdAt", "Created", {
        render: (category) => formatDate(category.createdAt),
      }),
      {
        key: "action",
        label: "Actions",
        sortable: false,
        cellStyle: { position: "relative" },
        render: (category) => (
          <div
            className="crewCompanyCategoryAction__wrapper"
            ref={openActionMenuId === category._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="crewCompanyCategoryAction__button"
              onClick={() => handleToggleActionMenu(category._id)}
            >
              Action
              <FaChevronDown className="crewCompanyCategoryAction__icon" />
            </button>

            <div
              className={`crewCompanyCategoryAction__menu ${
                openActionMenuId === category._id
                  ? "crewCompanyCategoryAction__menuOpen"
                  : ""
              }`}
            >
              <button
                type="button"
                className="crewCompanyCategoryAction__item"
                onClick={() => handleEditClick(category)}
              >
                Edit
              </button>

              <button
                type="button"
                className="crewCompanyCategoryAction__item"
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
      pageClassName="crewCompanyCategoryPage__page"
      mainAreaClassName="crewCompanyCategoryPage__mainArea"
      contentClassName="crewCompanyCategoryPage__content"
      headerTitle="Crew Company Category"
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
              <CreateCrewCompanyCategoryModal
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
                entityLabel="crew company category"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="crewCompanyCategoryPage__topRow"
        title="Crew Company Category"
        titleClassName="crewCompanyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="crewCompanyCategoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="crewCompanyCategoryPage__breadcrumbActive">
              Crew Company Category
            </span>
          </div>
        }
        actions={
          <button
            type="button"
            className="crewCompanyCategoryPage__createButton"
            onClick={handleCreateClick}
          >
            <FaPlus />
            Create Category
          </button>
        }
      />

      <div className="crewCompanyCategoryPage__tableCard appCard">
        <div className="crewCompanyCategoryPage__tableControls">
          <CommonSelect
            className="crewCompanyCategoryPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="crewCompanyCategoryPage__searchBox"
            inputClassName="crewCompanyCategoryPage__searchInput"
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

        <div className="crewCompanyCategoryPage__tableWrapper">
          <CommonTable
            columns={categoryTableColumns}
            data={crewCompanyCategories}
            rowKey="_id"
            loading={loading && crewCompanyCategories.length === 0}
            loadingMessage="Loading crew company categories..."
            error={listError}
            errorMessage="Failed to load crew company categories."
            emptyMessage="No crew company categories found."
            tableClassName="crewCompanyCategoryPage__table"
            thContentClassName="crewCompanyCategoryPage__thContent"
            sortIconClassName="crewCompanyCategoryPage__sortIcon"
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