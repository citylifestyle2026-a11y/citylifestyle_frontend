import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus, FaChevronDown, FaSearch, FaCheckCircle, FaTimesCircle, FaUsers } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import CommonExportButton from "../Components/CommonExportButton";
import CreateEventHistoryModal from "../Components/CreateEventHistoryModal";
import DeleteUserModal from "../Components/DeleteUserModal";

import { getAllEventHistory, deleteEventHistory } from "../redux/contactEventHistory/contactEventHistoryThunk";
import { clearContactEventHistoryState } from "../redux/contactEventHistory/contactEventHistorySlice";
import {
  getHistoryEditionsApi,
  getEventHistoryStatsApi,
  markEventHistoryAttendanceApi,
  exportEventHistoryApi,
} from "../services/contactEventHistoryService";
import { confirmDialog } from "../utilits/appSwal";
import { saveBlob, XLSX_MIME } from "../utilits/download";

import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/EventHistory.css";
import { formatDateTime } from "../utilits/dateFormat";
import useClickOutside from "../hooks/useClickOutside";
import { ALL_ROWS_OPTION } from "../utilits/rowsPerPage";

// Sidebar -> Event History: a standalone page listing EVERY contact's
// event history (not scoped to one contact via a URL param anymore —
// "Add Details" now picks the Contact itself, from a dropdown, inside
// the modal). Reached directly from the Sidebar rather than from a
// per-row action on Contact List.

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));
ROWS_PER_PAGE_OPTIONS.push(ALL_ROWS_OPTION);

// Edition (e.g. "Parv 6") is what the admin sees; events created before the
// Edition field existed fall back to their title.
const editionLabel = (ev) => ev?.edition || ev?.title || "-";

// The person a history row belongs to. History is a permanent record, so it
// must still read properly when the live contact has lost a detail (e.g. the
// spouse was removed from a Couple contact):
//  - contactId       -> the live contact (populated by the backend)
//  - contactSnapshot -> copy of the person saved by the backend, used for any
//                       field the live contact has blank
// (A guest deleted from Guest List stays in the backend as a hidden
// history-only contact, so its row keeps showing normally.)
// A row with NO live contact at all (very old data) is flagged as "deleted".
const personOf = (row) => {
  const live = row?.contactId || {};
  const saved = row?.contactSnapshot || {};
  return {
    fullName: live.fullName || saved.fullName || "",
    whatsappNumber: live.whatsappNumber || saved.whatsappNumber || "",
    spouseName: live.spouseName || saved.spouseName || "",
    spouseMobile: live.spouseMobile || saved.spouseMobile || "",
  };
};
const isContactDeleted = (row) => !row?.contactId;
const DELETED_LABEL = "Deleted guest";

// Status filter: only the two results that matter on this page.
const STATUS_OPTIONS = ["Attended", "Not Attended"].map((v) => ({
  value: v,
  label: v,
}));

// Event badges shown per row before "+N more".
const MAX_VISIBLE_EVENTS = 3;

export default function EventHistory() {
  const dispatch = useDispatch();

  const { history, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.contactEventHistory
  );
  // Filter options come from the history itself, so a deleted event's
  // edition (e.g. "Parv 5") is still listed and can still be filtered.
  const [editionOptions, setEditionOptions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadEditions = useCallback(async () => {
    try {
      const res = await getHistoryEditionsApi();
      setEditionOptions(res?.data || []);
    } catch {
      setEditionOptions([]);
    }
  }, []);

  // Reload when the list changes (an entry added / deleted).
  useEffect(() => {
    loadEditions();
  }, [loadEditions, history]);

  // Attended / Not Attended counts for whatever is filtered on screen
  // (edition + search). Reloaded whenever the list reloads.
  const [stats, setStats] = useState({ total: 0, attended: 0, notAttended: 0, other: 0 });

  // searchTerm tracks the raw input value; search is the debounced value
  // actually sent to the API — same pattern as ContactList.jsx.
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  // Delete confirmation uses the same popup (DeleteUserModal) as every
  // other list page, and the row actions use the same "Action" dropdown.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteEntryIds, setDeleteEntryIds] = useState([]);
  const [deleteEntryName, setDeleteEntryName] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  // Rows whose full event list / notes are expanded. Collapsed rows stay
  // one line high no matter how many events a person has.
  const [expandedRowIds, setExpandedRowIds] = useState([]);
  const toggleRowExpanded = (id) =>
    setExpandedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const effectiveLimit = limit || rowsPerPage;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * effectiveLimit;
  const endIndex = Math.min(currentPage * effectiveLimit, total);
  const resolvedTotalPages = totalPages || 1;

  // Debounce the search input before it affects the API call / page reset.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const currentQuery = useMemo(() => {
    const q = { page: currentPage, limit: rowsPerPage };
    if (eventFilter) q.eventId = eventFilter;
    if (statusFilter) q.status = statusFilter;
    if (search) q.search = search;
    return q;
  }, [currentPage, rowsPerPage, eventFilter, statusFilter, search]);

  useEffect(() => {
    dispatch(getAllEventHistory(currentQuery));
  }, [dispatch, currentQuery]);

  const loadStats = useCallback(async () => {
    try {
      const params = {};
      if (eventFilter) params.eventId = eventFilter;
      if (search) params.search = search;
      const res = await getEventHistoryStatsApi(params);
      setStats(res?.data || { total: 0, attended: 0, notAttended: 0, other: 0 });
    } catch {
      // counts are a convenience only - the table still works without them
    }
  }, [eventFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats, history]);

  const actionMenuRef = useRef(null);
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  const handleToggleActionMenu = useCallback((entryId) => {
    setOpenActionMenuId((prev) => (prev === entryId ? null : entryId));
  }, []);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < resolvedTotalPages) setCurrentPage(currentPage + 1);
  };

  const handleAddClick = () => {
    setModalMode("create");
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  // Every table row is ONE person carrying all of their events
  // (row.entries). Edit opens the whole row; Delete removes the whole row.
  const handleEditClick = (row) => {
    setModalMode("edit");
    setEditingEntry(row);
    setOpenActionMenuId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setModalMode("create");
  };

  // Clicking a summary card filters the table to that status; clicking it
  // again clears the filter.
  const toggleStatusFilter = (status) => {
    setStatusFilter((prev) => (prev === status ? "" : status));
    setCurrentPage(1);
  };

  // Excel download of everything the page is filtered to (edition + search),
  // across ALL pages — not just the rows currently visible.
  const [exportLoading, setExportLoading] = useState(false);
  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const params = {};
      if (eventFilter) params.eventId = eventFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await exportEventHistoryApi(params);
      saveBlob(
        new Blob([response.data], { type: XLSX_MIME }),
        `EventHistory_${Date.now()}.xlsx`
      );
      showSuccess("Event history exported successfully");
    } catch (err) {
      showError(getErrorText(err, "Failed to export event history"));
    } finally {
      setExportLoading(false);
    }
  };

  // Guest came but the pass was never scanned: tick them Attended (green)
  // by hand. A manually marked entry can be put back to Not Attended.
  const handleMarkAttendance = async (row, entry, attended) => {
    setOpenActionMenuId(null);

    const person =
      (row.isSpouse ? personOf(row).spouseName : personOf(row).fullName) || "this guest";
    const edition = editionLabel(entry.eventId);

    const ok = await confirmDialog({
      title: attended ? "Mark as Attended?" : "Change back to Not Attended?",
      text: attended
        ? `${person} will be shown as Attended for ${edition}, even though the pass was not scanned.`
        : `${person} will be shown as Not Attended for ${edition} again.`,
      confirmText: attended ? "Yes, mark Attended" : "Yes, change",
      tone: "info",
    });
    if (!ok) return;

    try {
      await markEventHistoryAttendanceApi(entry._id, attended);
      showSuccess(attended ? "Marked as Attended" : "Changed back to Not Attended");
      dispatch(getAllEventHistory(currentQuery));
      loadStats();
    } catch (err) {
      showError(getErrorText(err, "Failed to update attendance"));
    }
  };

  const handleDeleteClick = (row) => {
    setIsModalOpen(false);
    setOpenActionMenuId(null);
    setDeleteEntryIds((row.entries || []).map((e) => e._id));
    setDeleteEntryName(
      (row.isSpouse ? personOf(row).spouseName : personOf(row).fullName) ||
        "this entry"
    );
    setIsDeleteOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteEntryIds([]);
    setDeleteEntryName("");
  };

  const handleConfirmDelete = async () => {
    const ids = deleteEntryIds;
    try {
      // The whole row = every event entry of this person.
      const results = await Promise.allSettled(
        ids.map((id) => dispatch(deleteEventHistory(id)).unwrap())
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === results.length) {
        showError("Failed to delete event history.");
      } else {
        showSuccess(
          "Event history deleted successfully" + (failed ? ` (${failed} failed)` : "")
        );
      }
      dispatch(getAllEventHistory(currentQuery));
      dispatch(clearContactEventHistoryState());
    } catch (err) {
      showError(getErrorText(err, "Failed to delete event history"));
    } finally {
      handleCloseDeleteModal();
    }
  };

  const historyTableColumns = useMemo(
    () => [
      {
        key: "contact",
        label: "Contact",
        cellClassName: "eventHistoryPage__contactCell",
        render: (entry) => {
          const person = personOf(entry);
          const deleted = isContactDeleted(entry);
          const deletedTag = deleted ? (
            <small style={{ color: "#c0392b", fontWeight: 600, marginLeft: 6 }}>
              ({DELETED_LABEL})
            </small>
          ) : null;

          return entry.isSpouse ? (
            <>
              {person.spouseName || (deleted ? DELETED_LABEL : "-")}
              {deletedTag}
              <br />
              <small style={{ color: "#8a8fa3", fontWeight: 400 }}>
                Spouse of {person.fullName || "-"}
              </small>
            </>
          ) : (
            <>
              {person.fullName || (deleted ? DELETED_LABEL : "-")}
              {person.fullName ? deletedTag : null}
            </>
          );
        },
      },
      {
        key: "mobile",
        label: "WhatsApp Number",
        render: (entry) =>
          (entry.isSpouse
            ? personOf(entry).spouseMobile
            : personOf(entry).whatsappNumber) || "-",
      },
      {
        key: "event",
        label: "Edition",
        cellClassName: "eventHistoryPage__eventCell",
        // One row per person; every event is a coloured badge (green =
        // Attended, red = Not Attended ...). Only the first
        // MAX_VISIBLE_EVENTS show until the row is expanded, so the row
        // height does not grow with the number of events.
        render: (row) => {
          const entries = row.entries || [];
          const expanded = expandedRowIds.includes(row._id);
          const shown = expanded ? entries : entries.slice(0, MAX_VISIBLE_EVENTS);
          const hidden = entries.length - MAX_VISIBLE_EVENTS;

          return (
            <div className="eventHistoryPage__eventList">
              {shown.map((entry) => (
                <span
                  key={entry._id}
                  title={entry.markedManually ? `${entry.status} (marked manually)` : entry.status || ""}
                  className={`eventHistoryPage__eventBadge eventHistoryPage__status--${(
                    entry.status || ""
                  ).replace(/\s+/g, "")}`}
                >
                  {editionLabel(entry.eventId)}
                </span>
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  className="eventHistoryPage__moreBtn"
                  onClick={() => toggleRowExpanded(row._id)}
                >
                  {expanded ? "Show less" : `+${hidden} more`}
                </button>
              )}
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        // Colour of each badge already shows the status per event, so this
        // column only summarises it: "1 Attended · 2 Not Attended".
        render: (row) => {
          const entries = row.entries || [];
          if (entries.length === 0) return "-";

          const counts = new Map();
          for (const entry of entries) {
            const key = entry.status || "-";
            counts.set(key, (counts.get(key) || 0) + 1);
          }

          return (
            <div className="eventHistoryPage__statusSummary">
              {[...counts.entries()].map(([status, count]) => (
                <span key={status} className="eventHistoryPage__statusCount">
                  {entries.length > 1 ? `${count} ${status}` : status}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        key: "notes",
        label: "Notes",
        cellClassName: "eventHistoryPage__notesCell",
        // Only notes the admin typed are shown as text. The automatic text
        // Entry Report writes ("Attended Parv6 (added from Entry Report)")
        // just repeats what the coloured badge already says, so it becomes a
        // small "Entry Report" tag instead.
        render: (row) => {
          const entries = row.entries || [];
          const manualNotes = entries.filter(
            (e) => e.source !== "entry-report" && e.notes
          );
          const fromReport = entries.some((e) => e.source === "entry-report");

          if (manualNotes.length === 0 && !fromReport) return "-";

          const multiple = entries.length > 1;
          const label = (entry) =>
            multiple && (entry.eventId?.edition || entry.eventId?.title)
              ? `${editionLabel(entry.eventId)}: ${entry.notes}`
              : entry.notes;

          const tag = fromReport ? (
            <span
              className="eventHistoryPage__sourceTag"
              title="Added from Entry Report"
            >
              Entry Report
            </span>
          ) : null;

          if (expandedRowIds.includes(row._id)) {
            return (
              <div className="eventHistoryPage__stackedCell">
                {manualNotes.map((entry) => (
                  <div key={entry._id}>{label(entry)}</div>
                ))}
                {tag && <div>{tag}</div>}
              </div>
            );
          }

          return (
            <div
              className="eventHistoryPage__notesOneLine"
              title={manualNotes.map(label).join("\n")}
            >
              {manualNotes.length > 0 && (
                <span className="eventHistoryPage__notesText">
                  {label(manualNotes[0])}
                </span>
              )}
              {manualNotes.length > 1 && (
                <span className="eventHistoryPage__notesMore">
                  +{manualNotes.length - 1}
                </span>
              )}
              {tag}
            </div>
          );
        },
      },
      {
        key: "createdAt",
        label: "Added On",
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        cellStyle: { position: "relative" },
        render: (entry) => (
          <div
            className="eventHistoryAction__wrapper"
            ref={openActionMenuId === entry._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="eventHistoryAction__button"
              onClick={() => handleToggleActionMenu(entry._id)}
            >
              Action
              <FaChevronDown className="eventHistoryAction__icon" />
            </button>

            <div
              className={`eventHistoryAction__menu ${
                openActionMenuId === entry._id ? "eventHistoryAction__menuOpen" : ""
              }`}
            >
              {/* Manual attendance: one item per edition that is not green yet
                  (and an undo for the ones marked by hand). */}
              {(() => {
                const entries = entry.entries || [];
                const many = entries.length > 1;
                return entries.map((e) => {
                  if (e.status === "Attended" && e.markedManually) {
                    return (
                      <button
                        key={`undo-${e._id}`}
                        type="button"
                        className="eventHistoryAction__item"
                        onClick={() => handleMarkAttendance(entry, e, false)}
                      >
                        {many ? `Undo Attended (${editionLabel(e.eventId)})` : "Undo Attended"}
                      </button>
                    );
                  }
                  if (e.status === "Attended") return null;
                  return (
                    <button
                      key={`mark-${e._id}`}
                      type="button"
                      className="eventHistoryAction__item eventHistoryAction__itemAttend"
                      onClick={() => handleMarkAttendance(entry, e, true)}
                    >
                      {many ? `Mark Attended (${editionLabel(e.eventId)})` : "Mark as Attended"}
                    </button>
                  );
                });
              })()}
              {/* Edit only for rows added from the "Add Details" modal; rows
                  that came from Entry Report can only be deleted. */}
              {!isContactDeleted(entry) &&
                (entry.entries || []).some((e) => e.source !== "entry-report") && (
                <button
                  type="button"
                  className="eventHistoryAction__item eventHistoryAction__itemEdit"
                  onClick={() => handleEditClick(entry)}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="eventHistoryAction__item eventHistoryAction__itemDelete"
                onClick={() => handleDeleteClick(entry)}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ],
    [openActionMenuId, handleToggleActionMenu, expandedRowIds]
  );

  return (
    <CommonListLayout
      pageClassName="eventHistoryPage__page"
      mainAreaClassName="eventHistoryPage__mainArea"
      contentClassName="eventHistoryPage__content"
      headerTitle="Event History"
      outsideMainArea={
        <>
          {isModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCloseModal();
              }}
            >
              <CreateEventHistoryModal
                onClose={handleCloseModal}
                isEditMode={modalMode === "edit"}
                editRow={editingEntry}
                currentQuery={currentQuery}
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
                userName={deleteEntryName}
                entityLabel="event history entry"
                onClose={handleCloseDeleteModal}
                onDelete={handleConfirmDelete}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="eventHistoryPage__topRow"
        title="Event History"
        titleClassName="eventHistoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="eventHistoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="eventHistoryPage__breadcrumbActive">Event History</span>
          </div>
        }
        actions={
          <div className="eventHistoryPage__headerActions">
            <CommonExportButton
              onClick={handleExport}
              loading={exportLoading}
              disabled={exportLoading || total === 0}
              label="Export Excel"
              className="eventHistoryPage__exportButton"
              iconClassName="eventHistoryPage__exportIcon"
              iconLoadingClassName="eventHistoryPage__exportIcon eventHistoryPage__exportIcon--spinning"
            />
            <button type="button" className="eventHistoryPage__createButton" onClick={handleAddClick}>
              <FaPlus />
              Add Details
            </button>
          </div>
        }
      />

      <div className="eventHistoryPage__tableCard appCard">
        <div className="eventHistoryPage__tableControls">
          <CommonSelect
            className="eventHistoryPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="eventHistoryPage__searchBox"
            inputClassName="eventHistoryPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name, mobile or edition..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />

          <CommonSelect
            className="eventHistoryPage__filterSelect"
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Editions"
            options={editionOptions.map((ed) => ({ value: ed.value, label: ed.label }))}
          />

          <CommonSelect
            className="eventHistoryPage__filterSelect eventHistoryPage__statusSelect"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Status"
            options={STATUS_OPTIONS}
          />

          {(eventFilter || statusFilter || searchTerm) && (
            <button
              type="button"
              className="eventHistoryPage__clearFilters"
              onClick={() => {
                setEventFilter("");
                setStatusFilter("");
                setSearchTerm("");
                setSearch("");
                setCurrentPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Attended vs Not Attended for the current edition / search. */}
        <div className="eventHistoryPage__stats" aria-label="Attendance summary">
          <button
            type="button"
            className={`eventHistoryPage__statCard ${statusFilter === "" ? "eventHistoryPage__statCard--active" : ""}`}
            onClick={() => {
              setStatusFilter("");
              setCurrentPage(1);
            }}
            title="Show all"
          >
            <span className="eventHistoryPage__statIcon eventHistoryPage__statIcon--total">
              <FaUsers />
            </span>
            <div>
              <div className="eventHistoryPage__statValue">{stats.total}</div>
              <div className="eventHistoryPage__statLabel">Total</div>
            </div>
          </button>
          <button
            type="button"
            className={`eventHistoryPage__statCard eventHistoryPage__statCard--attended ${statusFilter === "Attended" ? "eventHistoryPage__statCard--active" : ""}`}
            onClick={() => toggleStatusFilter("Attended")}
            title="Show only Attended"
          >
            <span className="eventHistoryPage__statIcon eventHistoryPage__statIcon--attended">
              <FaCheckCircle />
            </span>
            <div>
              <div className="eventHistoryPage__statValue">{stats.attended}</div>
              <div className="eventHistoryPage__statLabel">Attended</div>
            </div>
          </button>
          <button
            type="button"
            className={`eventHistoryPage__statCard eventHistoryPage__statCard--notAttended ${statusFilter === "Not Attended" ? "eventHistoryPage__statCard--active" : ""}`}
            onClick={() => toggleStatusFilter("Not Attended")}
            title="Show only Not Attended"
          >
            <span className="eventHistoryPage__statIcon eventHistoryPage__statIcon--notAttended">
              <FaTimesCircle />
            </span>
            <div>
              <div className="eventHistoryPage__statValue">{stats.notAttended}</div>
              <div className="eventHistoryPage__statLabel">Not Attended</div>
            </div>
          </button>
        </div>

        {/* Colour legend only makes sense when there are rows to colour. */}
        {!loading && !error && (history || []).length > 0 && (
          <div className="eventHistoryPage__legend" aria-label="Colour meaning">
            <span className="eventHistoryPage__legendTitle">Colour meaning:</span>
            <span className="eventHistoryPage__legendItem">
              <span className="eventHistoryPage__legendDot eventHistoryPage__legendDot--attended" />
              Green = Attended
            </span>
            <span className="eventHistoryPage__legendItem">
              <span className="eventHistoryPage__legendDot eventHistoryPage__legendDot--notAttended" />
              Red = Not Attended
            </span>
          </div>
        )}

        <div className="eventHistoryPage__tableWrapper">
          <CommonTable
            columns={historyTableColumns}
            data={history}
            rowKey="_id"
            loading={loading && history.length === 0}
            loadingMessage="Loading event history..."
            error={error}
            errorMessage="Failed to load event history."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="eventHistoryPage__stateWrap"
                textClassName="eventHistoryPage__stateText"
                message={
                  search ? `No event history found for "${search}".` : statusFilter || eventFilter ? "No event history found for the selected filters." : "No event history found."
                }
              />
            }
            tableClassName="eventHistoryPage__table"
            thContentClassName="eventHistoryPage__thContent"
            sortIconClassName="eventHistoryPage__sortIcon"
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