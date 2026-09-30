import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus, FaChevronDown } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import CreateEventHistoryModal from "../Components/CreateEventHistoryModal";
import DeleteUserModal from "../Components/DeleteUserModal";

import { getAllEventHistory, deleteEventHistory } from "../redux/contactEventHistory/contactEventHistoryThunk";
import { clearContactEventHistoryState } from "../redux/contactEventHistory/contactEventHistorySlice";
import useEventOptions from "../hooks/useEventOptions";

import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/EventHistory.css";

// Sidebar -> Event History: a standalone page listing EVERY contact's
// event history (not scoped to one contact via a URL param anymore —
// "Add Details" now picks the Contact itself, from a dropdown, inside
// the modal). Reached directly from the Sidebar rather than from a
// per-row action on Contact List.

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  const hh = String(hours).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${minutes} ${ampm}`;
};

// Edition (e.g. "Parv 6") is what the admin sees; events created before the
// Edition field existed fall back to their title.
const editionLabel = (ev) => ev?.edition || ev?.title || "-";

// Event badges shown per row before "+N more".
const MAX_VISIBLE_EVENTS = 3;

export default function EventHistory() {
  const dispatch = useDispatch();

  const { history, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.contactEventHistory
  );
  const { events } = useEventOptions();

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [eventFilter, setEventFilter] = useState("");

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

  const currentQuery = useMemo(() => {
    const q = { page: currentPage, limit: rowsPerPage };
    if (eventFilter) q.eventId = eventFilter;
    return q;
  }, [currentPage, rowsPerPage, eventFilter]);

  useEffect(() => {
    dispatch(getAllEventHistory(currentQuery));
  }, [dispatch, currentQuery]);

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

  const handleDeleteClick = (row) => {
    setIsModalOpen(false);
    setOpenActionMenuId(null);
    setDeleteEntryIds((row.entries || []).map((e) => e._id));
    setDeleteEntryName(
      (row.isSpouse ? row.contactId?.spouseName : row.contactId?.fullName) ||
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
        render: (entry) =>
          entry.isSpouse ? (
            <>
              {entry.contactId?.spouseName || "-"}
              <br />
              <small style={{ color: "#8a8fa3", fontWeight: 400 }}>
                Spouse of {entry.contactId?.fullName || "-"}
              </small>
            </>
          ) : (
            entry.contactId?.fullName || "-"
          ),
      },
      {
        key: "mobile",
        label: "WhatsApp Number",
        render: (entry) =>
          (entry.isSpouse
            ? entry.contactId?.spouseMobile
            : entry.contactId?.whatsappNumber) || "-",
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
                  title={entry.status || ""}
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
              {/* Edit only for rows added from the "Add Details" modal; rows
                  that came from Entry Report can only be deleted. */}
              {(entry.entries || []).some((e) => e.source !== "entry-report") && (
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

          <CommonSelect
            className="eventHistoryPage__filterSelect"
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Editions"
            options={(events || []).map((ev) => ({ value: ev._id, label: editionLabel(ev) }))}
          />
        </div>

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

        <div className="eventHistoryPage__tableWrapper">
          <CommonTable
            columns={historyTableColumns}
            data={history}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading event history..."
            error={error}
            errorMessage="Failed to load event history."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="eventHistoryPage__stateWrap"
                textClassName="eventHistoryPage__stateText"
                message="No event history found."
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