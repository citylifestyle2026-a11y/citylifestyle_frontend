import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaFileExcel,
  FaUserPlus,
  FaChevronDown,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTrash,
  FaDownload,
} from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import ImportMembersModal from "../Components/ImportMembersModal";
import MoveToGuestListModal from "../Components/MoveToGuestListModal";
import EditMemberModal from "../Components/EditMemberModal";
import MultiSelect from "../Components/MultiSelect";
import { ContactPerson, InstagramLink } from "../Components/ContactAvatar";

import {
  getAllMembersApi,
  getMemberProfessionsApi,
  getMemberReferencesApi,
  deleteMemberApi,
  bulkDeleteMembersApi,
  exportMembersApi,
  exportMembersExcelApi,
} from "../services/memberService";
import { confirmDialog } from "../utilits/appSwal";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";

import "../assets/CSS/ContactList.css";
import "../assets/CSS/MemberList.css";
import useClickOutside from "../hooks/useClickOutside";
import { ALL_ROWS_OPTION } from "../utilits/rowsPerPage";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 200].map((n) => ({
  value: n,
  label: String(n),
}));
ROWS_PER_PAGE_OPTIONS.push(ALL_ROWS_OPTION);

// Tabs on top of the table. "" = every member.
const MOVED_TABS = [
  { value: "", label: "All", countKey: "all", tone: "all" },
  { value: "notInGuestList", label: "Not in Guest List", countKey: "notInGuestList", tone: "pending" },
  { value: "inGuestList", label: "In Guest List", countKey: "inGuestList", tone: "approved" },
  { value: "needsFix", label: "Needs Fix", countKey: "needsFix", tone: "rejected" },
];

// Inside the Needs Fix tab: show every problem row, or only one kind.
const FIX_TABS = [
  { value: "", label: "All", countKey: "needsFix", tone: "all" },
  { value: "invalid", label: "Invalid", countKey: "invalid", tone: "rejected" },
  { value: "duplicate", label: "Duplicate", countKey: "duplicate", tone: "pending" },
];

// Columns the server can sort by (see SORTABLE in services/member.service.js).
const SORTABLE_COLUMNS = ["name", "mobile", "profession", "companyName", "city"];

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState([]);
  const [movedFilter, setMovedFilter] = useState("");
  const [fixType, setFixType] = useState(""); // "" | "invalid" | "duplicate" (Needs Fix tab only)
  const [bulkBusy, setBulkBusy] = useState(false);
  const [professions, setProfessions] = useState([]);
  const [references, setReferences] = useState([]);
  const [counts, setCounts] = useState({ all: 0, inGuestList: 0, notInGuestList: 0, needsFix: 0, invalid: 0, duplicate: 0 });

  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Row "Action" dropdown (same as Guest List).
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  // Checkbox selection: id -> member for the rows picked by hand, or
  // "select all matching" = every member that matches the current filters.
  const [selected, setSelected] = useState({});
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      profession: professionFilter || undefined,
      // Nothing ticked, or EVERY reference ticked ("Select all") = no
      // reference filter, so all members show. Otherwise one "|" joined
      // param (short URL, no array-parsing limits).
      reference:
        referenceFilter.length === 0 ||
        (references.length > 0 && referenceFilter.length >= references.length)
          ? undefined
          : referenceFilter.join("|"),
      moved: movedFilter || undefined,
      fixType: movedFilter === "needsFix" && fixType ? fixType : undefined,
    }),
    [search, professionFilter, referenceFilter, references, movedFilter, fixType]
  );

  // Debounced search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [prof, refs] = await Promise.all([
        getMemberProfessionsApi(),
        getMemberReferencesApi(),
      ]);
      setProfessions(prof?.data || []);
      setReferences(refs?.data || []);
    } catch {
      setProfessions([]);
      setReferences([]);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions, refreshKey]);

  // Close the Action dropdown on an outside click (same as Guest List).
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  const handleToggleActionMenu = useCallback((id) => {
    setOpenActionMenuId((prev) => (prev === id ? null : id));
  }, []);

  // Same sort behaviour as Guest List: same column flips direction, a new
  // column starts ascending, and the list returns to page 1.
  const handleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortOrder("asc");
      return field;
    });
    setCurrentPage(1);
  }, []);

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
            sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />
          ) : (
            <FaSort />
          )}
        </span>
        {label}
      </span>
    ),
    [sortBy, sortOrder, handleSort]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getAllMembersApi({
          ...filters,
          page: currentPage,
          limit: rowsPerPage,
          sortBy,
          sortOrder,
        });
        if (cancelled) return;
        setMembers(res.data || []);
        if (res.counts) setCounts(res.counts);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, currentPage, rowsPerPage, sortBy, sortOrder, refreshKey]);

  // A different filter / page size means a different "all matching" set.
  useEffect(() => {
    setSelectAllMatching(false);
  }, [filters]);

  // ---------- selection ----------
  const selectedCount = selectAllMatching ? total : Object.keys(selected).length;

  const allOnPageSelected =
    selectAllMatching ||
    (members.length > 0 && members.every((m) => selected[m._id]));
  const someOnPageSelected =
    !allOnPageSelected && members.some((m) => selected[m._id]);

  const toggleOne = useCallback((member) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[member._id]) delete next[member._id];
      else next[member._id] = member;
      return next;
    });
  }, []);

  const toggleAllOnPage = () => {
    if (selectAllMatching) {
      setSelectAllMatching(false);
      setSelected({});
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) members.forEach((m) => delete next[m._id]);
      else members.forEach((m) => (next[m._id] = m));
      return next;
    });
  };

  const clearSelection = () => {
    setSelected({});
    setSelectAllMatching(false);
  };

  // ---------- actions ----------
  const openMove = (list) => {
    setOpenActionMenuId(null);
    if (selectAllMatching && !list) {
      setMoveTarget({
        payload: { selectAll: true, filters },
        count: total,
        label: `All ${total} contacts matching your filters`,
      });
      return;
    }

    const targets = list || Object.values(selected);
    if (!targets.length) return;

    setMoveTarget({
      payload: { ids: targets.map((m) => m._id) },
      count: targets.length,
      label: targets.length === 1 ? targets[0].name : undefined,
    });
  };

  const handleDelete = async (member) => {
    setOpenActionMenuId(null);
    const confirmed = await confirmDialog({
      title: `Delete ${member.name}?`,
      text: "This contact will be permanently deleted from Contact Book.",
      points: [
        { icon: "🗑️", text: "This cannot be undone." },
        { icon: "👥", text: "Guests already in the Guest List are not affected." },
      ],
      confirmText: "Yes, Delete",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteMemberApi(member._id);
      showSuccess("Contact deleted successfully");
      setSelected((prev) => {
        const next = { ...prev };
        delete next[member._id];
        return next;
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showError(getErrorText(err, "Failed to delete contact"));
    }
  };

  // ---------- Needs Fix: delete all / export ----------
  const fixLabel = fixType === "duplicate" ? "Duplicate" : fixType === "invalid" ? "Invalid" : "Needs Fix";

  const handleDeleteAllFix = async () => {
    if (!total || bulkBusy) return;
    const confirmed = await confirmDialog({
      title: `Delete all ${total} ${fixLabel} contact${total === 1 ? "" : "s"}?`,
      text: `Every ${fixLabel} contact currently shown (all pages) will be permanently deleted from Contact Book.`,
      points: [
        { icon: "🗑️", text: "This cannot be undone." },
        { icon: "📥", text: "Tip: use Export first if you want to correct and import them again." },
      ],
      confirmText: `Yes, Delete ${total}`,
      tone: "danger",
    });
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await bulkDeleteMembersApi({ selectAll: true, filters });
      showSuccess(res?.message || "Contacts deleted");
      clearSelection();
      setCurrentPage(1);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showError(getErrorText(err, "Failed to delete contacts"));
    } finally {
      setBulkBusy(false);
    }
  };

  // Delete only the ticked rows (Needs Fix tab).
  const handleDeleteSelectedFix = async () => {
    if (!selectedCount || bulkBusy) return;
    const confirmed = await confirmDialog({
      title: `Delete ${selectedCount} selected contact${selectedCount === 1 ? "" : "s"}?`,
      text: "The selected contacts will be permanently deleted from Contact Book.",
      points: [{ icon: "🗑️", text: "This cannot be undone." }],
      confirmText: `Yes, Delete ${selectedCount}`,
      tone: "danger",
    });
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await bulkDeleteMembersApi(
        selectAllMatching
          ? { selectAll: true, filters }
          : { ids: Object.keys(selected) }
      );
      showSuccess(res?.message || "Contacts deleted");
      clearSelection();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showError(getErrorText(err, "Failed to delete contacts"));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportFix = async () => {
    if (!total || bulkBusy) return;
    setBulkBusy(true);
    try {
      await exportMembersApi(filters, `members-${(fixType || "needs-fix")}.csv`);
    } catch (err) {
      showError(getErrorText(err, "Failed to export contacts"));
    } finally {
      setBulkBusy(false);
    }
  };

  // Excel export of whatever is on screen: current tab + fixType + search +
  // profession + reference. If rows are ticked by hand, only those are exported.
  const [exporting, setExporting] = useState(false);
  const handleExportExcel = async () => {
    if (!total || exporting) return;
    setExporting(true);
    try {
      const ids = !selectAllMatching && selectedCount > 0 ? Object.keys(selected).join(",") : undefined;
      const tab = { needsFix: "needs-fix", inGuestList: "in-guest-list", notInGuestList: "not-in-guest-list" }[movedFilter];
      const fileName = [
        "contact-book",
        tab,
        movedFilter === "needsFix" ? fixType : "",
        new Date().toISOString().slice(0, 10),
      ]
        .filter(Boolean)
        .join("-");
      await exportMembersExcelApi({ ...filters, ids }, `${fileName}.xlsx`);
      showSuccess("Excel downloaded");
    } catch (err) {
      showError(getErrorText(err, "Failed to export Excel"));
    } finally {
      setExporting(false);
    }
  };

  // ---------- table ----------
  const columns = useMemo(() => {
    // Sortable columns get a clickable header, the rest keep CommonTable's
    // default header - exactly like the Guest List table.
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
      {
        key: "select",
        sortable: false,
        headerClassName: "contactPage__checkCol",
        cellClassName: "contactPage__checkCol",
        label: (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label="Select all contacts on this page"
            checked={allOnPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = someOnPageSelected;
            }}
            onChange={toggleAllOnPage}
            disabled={members.length === 0}
          />
        ),
        render: (member) => (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label={`Select ${member.name}`}
            checked={selectAllMatching || !!selected[member._id]}
            disabled={selectAllMatching}
            onChange={() => toggleOne(member)}
          />
        ),
      },
      sortableColumn("name", "Full Name", {
        cellClassName: "contactPage__contactName",
        render: (member) => (
          <ContactPerson name={member.name} image={member.profileImage} />
        ),
      }),
      {
        key: "memberStatus",
        label: "Status",
        sortable: false,
        render: (m) => (
          <span className="memberPage__status">{m.memberStatus || "-"}</span>
        ),
      },
      {
        key: "guestList",
        label: "Guest List",
        sortable: false,
        render: (m) => {
          // "In ..." only for editions that are still running. Editions that
          // have ended (or were deleted) stay in the tooltip as history, and
          // the member can be moved again.
          const current = m.currentMovedTo || [];
          const all = m.movedTo || [];
          const last = current[current.length - 1];
          const history = all.map((x) => x.editionName).join(", ");

          if (last) {
            return (
              <span className="memberPage__movedTag" title={history}>
                In {last.editionName}
                {current.length > 1 ? ` +${current.length - 1}` : ""}
              </span>
            );
          }

          return all.length ? (
            <span style={{ opacity: 0.6 }} title={history}>
              Past: {all[all.length - 1].editionName}
            </span>
          ) : (
            "-"
          );
        },
      },
      // ---- Same order and names as the public form (Create Contact) ----
      sortableColumn("mobile", "WhatsApp Number", {
        render: (m) => (
          <span>
            {m.mobile || "-"}
            {m.mobileStatus && m.mobileStatus !== "valid" && (
              <span className="memberPage__fixTag" title={m.importNote || ""}>
                {m.mobileStatus === "duplicate" ? "Duplicate" : "Invalid"}
              </span>
            )}
          </span>
        ),
      }),
      sortableColumn("companyName", "Company Name", {
        cellClassName: "contactPage__wrapCell",
        render: (m) => m.companyName || "-",
      }),
      {
        key: "designation",
        label: "Designation",
        sortable: false,
        cellClassName: "contactPage__wrapCell",
        render: (m) => m.designation || "-",
      },
      // Member "profession" = the Company Category chosen in the form.
      sortableColumn("profession", "Company Category", {
        cellClassName: "contactPage__wrapCell",
        render: (m) => m.profession || "-",
      }),
      {
        key: "address",
        label: "Address",
        sortable: false,
        cellClassName: "contactPage__addressCell",
        render: (m) => m.address || "-",
      },
      { key: "area", label: "Area", sortable: false, render: (m) => m.area || "-" },
      {
        key: "instagramId",
        label: "Instagram Link",
        sortable: false,
        render: (m) => <InstagramLink id={m.instagramId} />,
      },
      {
        key: "relationship",
        label: "Relationship",
        sortable: false,
        render: (m) => m.relationship || "Single",
      },
      {
        key: "spouseName",
        label: "Spouse Name",
        sortable: false,
        render: (m) => <ContactPerson name={m.spouseName} image={m.spouseProfileImage} />,
      },
      {
        key: "spouseMobile",
        label: "Spouse Mobile Number",
        sortable: false,
        render: (m) => m.spouseMobile || "-",
      },
      {
        key: "spouseInstagramId",
        label: "Spouse Instagram Link",
        sortable: false,
        render: (m) => <InstagramLink id={m.spouseInstagramId} />,
      },
      {
        key: "spouseProfession",
        label: "Spouse Category",
        sortable: false,
        render: (m) => m.spouseProfession || "-",
      },
      {
        key: "references",
        label: "Reference",
        sortable: false,
        cellClassName: "contactPage__wrapCell",
        render: (m) => (m.references?.length ? m.references.join(", ") : "-"),
      },
      // ---- Not on the public form: kept at the end, before Actions ----
      {
        key: "email",
        label: "Email",
        sortable: false,
        render: (m) => m.email || "-",
      },
      sortableColumn("city", "City", {
        render: (m) => m.city || "-",
      }),
      { key: "state", label: "State", sortable: false, render: (m) => m.state || "-" },
      { key: "source", label: "Source", sortable: false, render: (m) => m.source || "-" },
      {
        key: "remark",
        label: "Remark",
        sortable: false,
        cellClassName: "contactPage__addressCell",
        render: (m) => m.remark || "-",
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        // Pinned to the right edge, like Guest List.
        headerClassName: "contactPage__actionCol",
        cellClassName: "contactPage__actionCol",
        render: (member) => (
          <div
            className="contactAction__wrapper"
            ref={openActionMenuId === member._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="contactAction__button"
              onClick={() => handleToggleActionMenu(member._id)}
            >
              Action
              <FaChevronDown className="contactAction__icon" />
            </button>

            <div
              className={`contactAction__menu ${
                openActionMenuId === member._id ? "contactAction__menuOpen" : ""
              }`}
            >
              <button
                type="button"
                className="contactAction__item contactAction__itemEdit"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setEditMember(member);
                }}
              >
                Edit
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemDelete"
                onClick={() => handleDelete(member)}
              >
                Delete
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemApprove"
                onClick={() => openMove([member])}
              >
                Move to Guest List
              </button>
            </div>
          </div>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    members,
    selected,
    selectAllMatching,
    allOnPageSelected,
    someOnPageSelected,
    openActionMenuId,
    renderSortableHeader,
  ]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + members.length, total);

  const professionOptions = professions.map((p) => ({ value: p, label: p }));
  const referenceOptions = references.map((r) => ({ value: r, label: r }));

  return (
    <CommonListLayout
      pageClassName="contactPage__page"
      mainAreaClassName="contactPage__mainArea"
      contentClassName="contactPage__content"
      headerTitle="Contact Book"
      outsideMainArea={
        <>
          {isImportOpen && (
            <ImportMembersModal
              onClose={() => setIsImportOpen(false)}
              onSuccess={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {isAddOpen && (
            <EditMemberModal
              member={null}
              onClose={() => setIsAddOpen(false)}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {editMember && (
            <EditMemberModal
              member={editMember}
              onClose={() => setEditMember(null)}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {moveTarget && (
            <MoveToGuestListModal
              payload={moveTarget.payload}
              count={moveTarget.count}
              label={moveTarget.label}
              onClose={() => setMoveTarget(null)}
              onDone={() => {
                clearSelection();
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="contactPage__topRow"
        title="Contact Book"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Contact Book</span>
          </div>
        }
        actions={
          <div className="contactPage__headerActions">
            <button
              type="button"
              className="contactPage__createButton"
              onClick={() => setIsAddOpen(true)}
            >
              <FaUserPlus />
              Add Contact
            </button>

            <button
              type="button"
              className="contactPage__createButton"
              onClick={handleExportExcel}
              disabled={!total || exporting}
            >
              <FaDownload />
              {exporting
                ? "Exporting..."
                : `Export Excel (${!selectAllMatching && selectedCount > 0 ? selectedCount : total})`}
            </button>

            <button
              type="button"
              className="contactPage__createButton"
              onClick={() => setIsImportOpen(true)}
            >
              <FaFileExcel />
              Import Excel / CSV
            </button>
          </div>
        }
      />

      <div className="contactPage__tableCard appCard">
        <div className="contactPage__statusTabs" role="tablist">
          {MOVED_TABS.map((tab) => (
            <button
              key={tab.countKey}
              type="button"
              role="tab"
              aria-selected={movedFilter === tab.value}
              className={`contactPage__statusTab contactPage__statusTab--${tab.tone} ${
                movedFilter === tab.value ? "contactPage__statusTabActive" : ""
              }`}
              onClick={() => {
                setMovedFilter(tab.value);
                setFixType("");
                setCurrentPage(1);
              }}
            >
              {tab.label}
              <span className="contactPage__statusTabCount">
                {counts[tab.countKey] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {movedFilter === "needsFix" && (
          <div className="contactPage__statusTabs" role="tablist" aria-label="Needs Fix type">
            {FIX_TABS.map((tab) => (
              <button
                key={tab.countKey}
                type="button"
                role="tab"
                aria-selected={fixType === tab.value}
                className={`contactPage__statusTab contactPage__statusTab--${tab.tone} ${
                  fixType === tab.value ? "contactPage__statusTabActive" : ""
                }`}
                onClick={() => {
                  setFixType(tab.value);
                  setCurrentPage(1);
                }}
              >
                {tab.label}
                <span className="contactPage__statusTabCount">{counts[tab.countKey] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {movedFilter === "needsFix" && fixType && (
          <div className="contactPage__bulkBar">
            <span className="contactPage__bulkCount">
              {fixLabel}: {total} contact{total === 1 ? "" : "s"}
            </span>

            <div className="contactPage__bulkButtons">
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                onClick={handleExportFix}
                disabled={!total || bulkBusy}
              >
                <FaDownload /> Export {fixLabel} ({total})
              </button>

              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                onClick={handleDeleteAllFix}
                disabled={!total || bulkBusy}
              >
                <FaTrash /> Delete all {fixLabel} ({total})
              </button>
            </div>
          </div>
        )}

        {selectedCount > 0 && (
          <div className="contactPage__bulkBar">
            <span className="contactPage__bulkCount">
              {selectAllMatching ? `All ${total} selected` : `${selectedCount} selected`}
            </span>

            <div className="contactPage__bulkButtons">
              {movedFilter === "needsFix" ? (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                  onClick={handleDeleteSelectedFix}
                  disabled={bulkBusy}
                >
                  <FaTrash /> Delete selected ({selectedCount})
                </button>
              ) : (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                  onClick={() => openMove()}
                >
                  <FaUserPlus /> Move to Guest List ({selectedCount})
                </button>
              )}

              {!selectAllMatching && total > selectedCount && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--pending"
                  onClick={() => setSelectAllMatching(true)}
                >
                  Select all {total}
                </button>
              )}

              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--clear"
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
            placeholder="Search name, mobile, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <CommonSelect
            className="contactPage__filterSelect"
            value={professionFilter}
            onChange={(e) => {
              setProfessionFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Company Categories"
            options={professionOptions}
          />

          <MultiSelect
            value={referenceFilter}
            onChange={(next) => {
              setReferenceFilter(next);
              setCurrentPage(1);
            }}
            placeholder="All References"
            searchPlaceholder="Search reference..."
            options={referenceOptions}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={columns}
            data={members}
            rowKey="_id"
            loading={loading && members.length === 0}
            loadingMessage="Loading contacts..."
            error={error}
            errorMessage="Failed to load contacts."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="contactPage__stateWrap"
                textClassName="contactPage__stateText"
                message="No contacts found. Use Add Contact or Import Excel / CSV to add contacts."
              />
            }
            stateCellClassName="contactPage__stateCell"
            stateCellStyle={{}}
            rowClassName={(member) =>
              openActionMenuId === member._id ? "contactPage__rowActive" : ""
            }
            tableClassName="contactPage__table"
            thContentClassName="contactPage__thContent"
            sortIconClassName="contactPage__sortIcon"
          />
        </div>

        <CommonPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={total === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={total}
          showControls={total > rowsPerPage}
          onPageSelect={(page) => setCurrentPage(page)}
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === totalPages}
        />
      </div>
    </CommonListLayout>
  );
}