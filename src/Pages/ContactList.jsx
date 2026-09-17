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
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import CreateContactModal from "../Components/CreateContactModal";
import ContactDetailsModal from "../Components/ContactDetailsModal";
import CommonExportButton from "../Components/CommonExportButton";

import {
  getAllContacts,
  getUniqueReferences,
  getReferenceSummary,
  deleteContact,
  exportContacts,
} from "../redux/contact/contactThunk";
import { clearContactState } from "../redux/contact/contactSlice";
import { getAllCompanyCategories } from "../redux/companyCategory/companyCategoryThunk";

import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/ContactList.css";

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific
// options — same as ROWS_PER_PAGE_OPTIONS in Pages/User.jsx.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

// The Company Category filter needs the full category list in one go, not
// a paginated slice — the backend's get-all-categories endpoint is
// paginated (default limit 10), so a high explicit limit is passed here.
// This is only the filter dropdown's data source; Company Category
// management UI is a separate step.
const CATEGORY_FILTER_FETCH_LIMIT = 100;

// Only these fields are sortable server-side (see SORTABLE_FIELDS in
// services/contact.service.js). Columns outside this list render a plain,
// non-interactive header rather than a sort affordance that the API would
// silently ignore and fall back to `createdAt` for.
const SORTABLE_COLUMNS = ["fullName", "whatsappNumber", "companyName"];

export default function ContactList() {
  const dispatch = useDispatch();

  const {
    contacts,
    loading,
    error,
    total,
    totalPages,
    limit,
    uniqueReferences,
    uniqueReferencesLoading,
    referenceSummary,
    exportLoading,
  } = useSelector((state) => state.contact);

  const { companyCategories } = useSelector((state) => state.companyCategory);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // searchTerm tracks the raw input value; search is the debounced value
  // actually sent to the API — same pattern as User.jsx/Event.jsx.
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  // Filters. Empty string = "no filter", which is why both are omitted
  // from the request params below rather than sent as "".
  const [categoryFilter, setCategoryFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");

  // Sorting. Defaults mirror the backend's own defaults so the first
  // render and the API agree without sending redundant params.
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Tracks which row's Action dropdown is currently open.
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Delete modal state.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState(null);
  const [deleteContactName, setDeleteContactName] = useState("");

  // Create/Edit modal state — a single modal instance handles both modes
  // (see CreateContactModal's own isEditMode prop), same pattern as
  // CreateUserModal.jsx.
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedContact, setSelectedContact] = useState(null);

  // View modal state.
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewContact, setViewContact] = useState(null);

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

  // Fetch contacts. Filters are only included when actually set, so an
  // unset filter never reaches the backend as an empty string (which
  // getAllContacts would have to defensively ignore anyway).
  useEffect(() => {
    const params = {
      page: currentPage,
      limit: rowsPerPage,
      search,
      sortBy,
      sortOrder,
    };

    if (categoryFilter) params.companyCategory = categoryFilter;
    if (referenceFilter) params.reference = referenceFilter;

    dispatch(getAllContacts(params));
  }, [
    dispatch,
    currentPage,
    rowsPerPage,
    search,
    sortBy,
    sortOrder,
    categoryFilter,
    referenceFilter,
  ]);

  // Filter dropdown data. Both are fetched once on mount — neither depends
  // on the list's own page/search state, so refetching them on every list
  // change would only add requests without changing the options.
  useEffect(() => {
    dispatch(getUniqueReferences({}));
    dispatch(
      getAllCompanyCategories({ page: 1, limit: CATEGORY_FILTER_FETCH_LIMIT })
    );
  }, [dispatch]);

  // Reference -> contact-names grouping data, used to enrich each
  // contact's own Reference chips below (see referenceContactsByKey /
  // contactTableColumns' "references" column) so a reference shared by
  // multiple contacts shows every contact name that holds it, right
  // inside the existing Contact List table — no separate section.
  // Fetched once on mount for the same reason as the filter dropdown
  // data above — it reflects every active contact, not just the current
  // page/search/filter selection.
  useEffect(() => {
    dispatch(getReferenceSummary());
  }, [dispatch]);

  // Ref for detecting outside clicks to close the action dropdown —
  // same pattern as actionMenuRef in Pages/User.jsx.
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

  const handleToggleActionMenu = useCallback((contactId) => {
    setOpenActionMenuId((prev) => (prev === contactId ? null : contactId));
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

  // Export uses the CURRENT search/sort/filters — same values already
  // sent to getAllContacts above — so the downloaded file always
  // matches exactly what the table is showing (not just every contact
  // unfiltered). Page/limit are intentionally omitted: every matching
  // contact is exported, not just the current page.
  const handleExport = () => {
    const params = {
      search,
      sortBy,
      sortOrder,
    };

    if (categoryFilter) params.companyCategory = categoryFilter;
    if (referenceFilter) params.reference = referenceFilter;

    dispatch(exportContacts(params));
  };

  const handleCreateClick = () => {
    setSelectedContact(null);
    setFormModalMode("create");
    setIsFormModalOpen(true);
  };

  const handleViewClick = useCallback((contact) => {
    setOpenActionMenuId(null);
    setViewContact(contact);
    setIsViewModalOpen(true);
  }, []);

  const handleEditClick = useCallback((contact) => {
    setOpenActionMenuId(null);
    setSelectedContact(contact);
    setFormModalMode("edit");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedContact(null);
    setFormModalMode("create");
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewContact(null);
  };

  const handleDeleteClick = useCallback((contact) => {
    setDeleteContactId(contact._id);
    setDeleteContactName(contact.fullName);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteContactId(null);
    setDeleteContactName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteContact(deleteContactId)).unwrap();

      showSuccess(res.message || "Contact deleted successfully");

      // Refetch using the list's CURRENT page/limit/search/sort/filters
      // rather than resetting them, so a delete doesn't yank the admin
      // back to page 1 — same reasoning as User.jsx's delete flow.
      const params = {
        page: currentPage,
        limit: rowsPerPage,
        search,
        sortBy,
        sortOrder,
      };

      if (categoryFilter) params.companyCategory = categoryFilter;
      if (referenceFilter) params.reference = referenceFilter;

      dispatch(getAllContacts(params));

      // A deleted contact may have been the only holder of one of its
      // references, in which case that value is no longer a valid filter
      // option — refresh the dropdown so it can't offer a reference that
      // would now return zero rows.
      dispatch(getUniqueReferences({}));

      // Same reasoning for the grouped Reference Summary section below
      // the table — a deleted contact's name (or an entire reference row
      // it was the sole holder of) must disappear from it too.
      dispatch(getReferenceSummary());

      dispatch(clearContactState());

      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete contact");
    }
  };

  // ---------- Filter options ----------

  const categoryFilterOptions = useMemo(
    () =>
      (companyCategories || []).map((category) => ({
        value: category._id,
        label: category.name,
      })),
    [companyCategories]
  );

  // The unique-references API already collapses values case-insensitively
  // across every contact (Karan's "a" and Mahesh's "A" arrive as one
  // entry). This second pass is a defensive guard only — it keeps the
  // dropdown from ever rendering a duplicate <option> (and the duplicate
  // React key that would come with it) if the endpoint is ever served
  // stale/unnormalized data.
  const referenceFilterOptions = useMemo(() => {
    const seen = new Set();

    return (uniqueReferences || []).reduce((options, reference) => {
      if (typeof reference !== "string") return options;

      const trimmed = reference.trim();
      if (!trimmed) return options;

      const key = trimmed.toLowerCase();
      if (seen.has(key)) return options;

      seen.add(key);
      options.push({ value: trimmed, label: trimmed });

      return options;
    }, []);
  }, [uniqueReferences]);

  // Reference options are shown alphabetically, case-insensitively (e.g.
  // "a, b, c, d, h, n, v") regardless of the order the backend returns
  // them in — independent of Contact List's own row sorting above.
const sortedReferenceFilterOptions = useMemo(
  () =>
    [...referenceFilterOptions].sort((a, b) =>
      a.label.toLowerCase().localeCompare(b.label.toLowerCase())
    ),
  [referenceFilterOptions]
);

  // Reference (normalized, case-insensitive) -> every contact name that
  // holds it, e.g. Karan -> [a,b,c,d] and Ramesh -> [a,g,h,p] becomes
  // "a" -> [Karan, Ramesh], "b" -> [Karan], "g" ->  [Ramesh], etc. Built
  // from the same grouped data the (now-removed) Reference Summary
  // section used, so a reference shared by multiple contacts still
  // appears as one combined entry — just shown inline in each of those
  // contacts' own Reference cell below instead of in a separate table.
  const referenceContactsByKey = useMemo(() => {
    const map = new Map();

    (referenceSummary || []).forEach((group) => {
      if (!group || typeof group.reference !== "string") return;

      const key = group.reference.trim().toLowerCase();
      const names = Array.isArray(group.contacts) ? group.contacts : [];

      map.set(key, names);
    });

    return map;
  }, [referenceSummary]);

  // ---------- Columns ----------

  // Builds a clickable header for a server-sortable column. Passed as the
  // column's `label` (with `sortable: false`) so CommonTable's own static
  // sort icon isn't rendered on top of this interactive one — CommonTable
  // itself stays untouched.
  const renderSortableHeader = useCallback(
    (label, field) => (
      <span
        className="contactPage__sortHeader"
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
          className={`contactPage__sortIcon ${
            sortBy === field ? "contactPage__sortIconActive" : ""
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

  const contactTableColumns = useMemo(() => {
    const sortableColumn = (key, label, extra = {}) => ({
      key,
      label: SORTABLE_COLUMNS.includes(key)
        ? renderSortableHeader(label, key)
        : label,
      sortable: false,
      ...extra,
    });

    return [
      sortableColumn("fullName", "Full Name", {
        cellClassName: "contactPage__contactName",
        render: (contact) => contact.fullName || "-",
      }),
      sortableColumn("whatsappNumber", "WhatsApp Number", {
        render: (contact) => contact.whatsappNumber || "-",
      }),
      sortableColumn("companyName", "Company Name", {
        render: (contact) => contact.companyName || "-",
      }),
      sortableColumn("companyCategory", "Company Category", {
        // Populated by the backend as { _id, name } (see
        // getAllContacts' .populate("companyCategory", "name")), and is
        // legitimately null for contacts with no category assigned.
        render: (contact) => contact.companyCategory?.name || "-",
      }),
      sortableColumn("address", "Address", {
        cellClassName: "contactPage__addressCell",
        render: (contact) => contact.address || "-",
      }),
      sortableColumn("references", "Reference", {
        render: (contact) => {
          const references = (
            Array.isArray(contact.references)
              ? contact.references.filter(
                  (reference) =>
                    typeof reference === "string" && reference.trim()
                )
              : []
          )
            // Alphabetical, case-insensitive (e.g. a, b, c, d, h, n, v) —
            // this only orders the Reference chips themselves, not the
            // Contact List row sorting above.
            .slice()
            .sort((a, b) =>
              a.trim().toLowerCase().localeCompare(b.trim().toLowerCase())
            );

          if (references.length === 0) return "-";

          return (
            <span className="contactPage__referenceCell">
              {references.map((reference) => {
                // Chip only ever shows the reference name itself now —
                // the "(Name, Name)" suffix that used to list every
                // contact sharing this reference has been dropped per
                // request. referenceContactsByKey / getReferenceSummary
                // are left untouched in case they're needed elsewhere.
                const label = reference;

                return (
                  <span key={reference} className="contactPage__referenceChip">
                    {label}
                  </span>
                );
              })}
            </span>
          );
        },
      }),
      {
        key: "action",
        label: "Actions",
        sortable: false,
        cellStyle: { position: "relative" },
        render: (contact) => (
          <div
            className="contactAction__wrapper"
            ref={openActionMenuId === contact._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="contactAction__button"
              onClick={() => handleToggleActionMenu(contact._id)}
            >
              Action
              <FaChevronDown className="contactAction__icon" />
            </button>

            <div
              className={`contactAction__menu ${
                openActionMenuId === contact._id
                  ? "contactAction__menuOpen"
                  : ""
              }`}
            >
              <button
                type="button"
                className="contactAction__item contactAction__itemView"
                onClick={() => handleViewClick(contact)}
              >
                View
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemEdit"
                onClick={() => handleEditClick(contact)}
              >
                Edit
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemDelete"
                onClick={() => handleDeleteClick(contact)}
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
    handleViewClick,
    handleEditClick,
    handleDeleteClick,
    referenceContactsByKey,
  ]);

  return (
    <CommonListLayout
      pageClassName="contactPage__page"
      mainAreaClassName="contactPage__mainArea"
      contentClassName="contactPage__content"
      headerTitle="Contact List"
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
              <CreateContactModal
                onClose={handleCloseFormModal}
                isEditMode={formModalMode === "edit"}
                editContactData={selectedContact}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                search={search}
                sortBy={sortBy}
                sortOrder={sortOrder}
                companyCategoryFilter={categoryFilter}
                referenceFilter={referenceFilter}
              />
            </div>
          )}

          {isViewModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseViewModal();
                }
              }}
            >
              <ContactDetailsModal
                contact={viewContact}
                onClose={handleCloseViewModal}
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
                userName={deleteContactName}
                entityLabel="contact"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="contactPage__topRow"
        title="Contact List"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Contact List</span>
          </div>
        }
        actions={
          <div className="contactPage__headerActions">
            <CommonExportButton
              onClick={handleExport}
              loading={exportLoading}
              disabled={exportLoading || total === 0}
              label="Export Contact List"
              className="contactPage__exportButton"
              iconClassName="contactPage__exportIcon"
              iconLoadingClassName="contactPage__exportIcon contactPage__exportIcon--spinning"
            />

            <button
              type="button"
              className="contactPage__createButton"
              onClick={handleCreateClick}
            >
              <FaPlus />
              Create Contact
            </button>
          </div>
        }
      />

      <div className="contactPage__tableCard">
        <div className="contactPage__tableControls">
          <CommonSelect
            className="contactPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="contactPage__searchBox"
            inputClassName="contactPage__searchInput"
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

          <CommonSelect
            className="contactPage__filterSelect"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Company Categories"
            options={categoryFilterOptions}
          />

          <CommonSelect
            className="contactPage__filterSelect"
            value={referenceFilter}
            onChange={(e) => {
              setReferenceFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All References"
            loading={uniqueReferencesLoading}
            options={sortedReferenceFilterOptions}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={contactTableColumns}
            data={contacts}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading contacts..."
            error={error}
            errorMessage="Failed to load contacts."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="contactPage__stateWrap"
                textClassName="contactPage__stateText"
                message="No contacts found."
              />
            }
            stateCellClassName="contactPage__stateCell"
            stateCellStyle={{}}
            tableClassName="contactPage__table"
            thContentClassName="contactPage__thContent"
            sortIconClassName="contactPage__sortIcon"
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