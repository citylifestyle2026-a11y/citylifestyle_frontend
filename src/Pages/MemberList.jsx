import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaFileExcel, FaUserPlus, FaTrash } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import ImportMembersModal from "../Components/ImportMembersModal";
import MoveToGuestListModal from "../Components/MoveToGuestListModal";
import { ContactAvatar } from "../Components/ContactAvatar";

import {
  getAllMembersApi,
  getMemberProfessionsApi,
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

const MOVED_OPTIONS = [
  { value: "notInGuestList", label: "Not in Guest List" },
  { value: "inGuestList", label: "In Guest List" },
];

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
  const [movedFilter, setMovedFilter] = useState("");
  const [professions, setProfessions] = useState([]);

  // Checkbox selection: id -> member for the rows picked by hand, or
  // "select all matching" = every member that matches the current filters.
  const [selected, setSelected] = useState({});
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      profession: professionFilter || undefined,
      moved: movedFilter || undefined,
    }),
    [search, professionFilter, movedFilter]
  );

  // Debounced search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadProfessions = useCallback(async () => {
    try {
      const res = await getMemberProfessionsApi();
      setProfessions(res?.data || []);
    } catch {
      setProfessions([]);
    }
  }, []);

  useEffect(() => {
    loadProfessions();
  }, [loadProfessions, refreshKey]);

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
        });
        if (cancelled) return;
        setMembers(res.data || []);
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
  }, [filters, currentPage, rowsPerPage, refreshKey]);

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
  const columns = useMemo(
    () => [
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
      {
        key: "name",
        label: "Name",
        sortable: false,
        render: (member) => (
          <span className="memberPage__person">
            <ContactAvatar name={member.name} />
            <span className="memberPage__personName">{member.name}</span>
          </span>
        ),
      },
      { key: "mobile", label: "Mobile", sortable: false, render: (m) => m.mobile || "-" },
      { key: "profession", label: "Profession", sortable: false, render: (m) => m.profession || "-" },
      { key: "companyName", label: "Company / Brand", sortable: false, render: (m) => m.companyName || "-" },
      {
        key: "location",
        label: "Area / City",
        sortable: false,
        render: (m) => [m.area, m.city].filter(Boolean).join(", ") || "-",
      },
      {
        key: "references",
        label: "Reference",
        sortable: false,
        render: (m) => (m.references?.length ? m.references.join(", ") : "-"),
      },
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
          const last = m.movedTo?.[m.movedTo.length - 1];
          return last ? (
            <span
              className="memberPage__movedTag"
              title={m.movedTo.map((x) => x.editionName).join(", ")}
            >
              In {last.editionName}
              {m.movedTo.length > 1 ? ` +${m.movedTo.length - 1}` : ""}
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        headerClassName: "contactPage__actionCol",
        cellClassName: "contactPage__actionCol",
        render: (member) => (
          <div className="memberPage__actions">
            <button
              type="button"
              className="memberPage__moveBtn"
              onClick={() => openMove([member])}
              title="Move to Guest List"
            >
              <FaUserPlus /> Guest List
            </button>
            <button
              type="button"
              className="memberPage__deleteBtn"
              onClick={() => handleDelete(member)}
              title="Delete member"
              aria-label={`Delete ${member.name}`}
            >
              <FaTrash />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, selected, selectAllMatching, allOnPageSelected, someOnPageSelected]
  );

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + members.length, total);

  const professionOptions = professions.map((p) => ({ value: p, label: p }));

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
              onClick={() => setIsImportOpen(true)}
            >
              <FaFileExcel />
              Import Excel / CSV
            </button>
          </div>
        }
      />

      <div className="contactPage__tableCard appCard">
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
            value={movedFilter}
            onChange={(e) => {
              setMovedFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Members"
            options={MOVED_OPTIONS}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={columns}
            data={members}
            rowKey="_id"
            loading={loading}
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
