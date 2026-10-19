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
import { ContactPerson } from "../Components/ContactAvatar";

import {
  getAllMembersApi,
  getMemberProfessionsApi,
  getMemberReferencesApi,
  deleteMemberApi,
} from "../services/memberService";
import { confirmDialog } from "../utilits/appSwal";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";

import "../assets/CSS/ContactList.css";
import "../assets/CSS/MemberList.css";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 200].map((n) => ({
  value: n,
  label: String(n),
}));

// Tabs on top of the table. "" = every member.
const MOVED_TABS = [
  { value: "", label: "All", countKey: "all", tone: "all" },
  { value: "notInGuestList", label: "Not in Guest List", countKey: "notInGuestList", tone: "pending" },
  { value: "inGuestList", label: "In Guest List", countKey: "inGuestList", tone: "approved" },
  { value: "needsFix", label: "Needs Fix", countKey: "needsFix", tone: "rejected" },
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
  const [referenceFilter, setReferenceFilter] = useState("");
  const [movedFilter, setMovedFilter] = useState("");
  const [professions, setProfessions] = useState([]);
  const [references, setReferences] = useState([]);
  const [counts, setCounts] = useState({ all: 0, inGuestList: 0, notInGuestList: 0, needsFix: 0 });

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
      reference: referenceFilter || undefined,
      moved: movedFilter || undefined,
    }),
    [search, professionFilter, referenceFilter, movedFilter]
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
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        label: `All ${total} members matching your filters`,
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
      text: "This member will be permanently deleted from Member List.",
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
      showSuccess("Member deleted successfully");
      setSelected((prev) => {
        const next = { ...prev };
        delete next[member._id];
        return next;
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showError(getErrorText(err, "Failed to delete member"));
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
            aria-label="Select all members on this page"
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
      sortableColumn("name", "Name", {
        cellClassName: "contactPage__contactName",
        render: (member) => <ContactPerson name={member.name} />,
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
      sortableColumn("mobile", "Mobile", {
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
      sortableColumn("profession", "Profession", { render: (m) => m.profession || "-" }),
      sortableColumn("companyName", "Company / Brand", { render: (m) => m.companyName || "-" }),
      sortableColumn("city", "Area / City", {
        render: (m) => [m.area, m.city].filter(Boolean).join(", ") || "-",
      }),
      {
        key: "references",
        label: "Reference",
        render: (m) => (m.references?.length ? m.references.join(", ") : "-"),
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
                className="contactAction__item contactAction__itemApprove"
                onClick={() => openMove([member])}
              >
                Move to Guest List
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemDelete"
                onClick={() => handleDelete(member)}
              >
                Delete
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
      headerTitle="Member List"
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
        title="Member List"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Member List</span>
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
              Add Member
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

        {selectedCount > 0 && (
          <div className="contactPage__bulkBar">
            <span className="contactPage__bulkCount">
              {selectAllMatching ? `All ${total} selected` : `${selectedCount} selected`}
            </span>

            <div className="contactPage__bulkButtons">
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                onClick={() => openMove()}
              >
                <FaUserPlus /> Move to Guest List ({selectedCount})
              </button>

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
            placeholder="All Professions"
            options={professionOptions}
          />

          <CommonSelect
            className="contactPage__filterSelect"
            value={referenceFilter}
            onChange={(e) => {
              setReferenceFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All References"
            options={referenceOptions}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={columns}
            data={members}
            rowKey="_id"
            loading={loading && members.length === 0}
            loadingMessage="Loading members..."
            error={error}
            errorMessage="Failed to load members."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="contactPage__stateWrap"
                textClassName="contactPage__stateText"
                message="No members found. Use Import Excel / CSV to add members."
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
