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
import { getAllEditions } from "../redux/edition/editionThunk";

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

export default function EventHistory() {
  const dispatch = useDispatch();

  const { history, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.contactEventHistory
  );
  const { editions } = useSelector((state) => state.edition);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editionFilter, setEditionFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  // Delete confirmation uses the same popup (DeleteUserModal) as every
  // other list page, and the row actions use the same "Action" dropdown.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState(null);
  const [deleteEntryName, setDeleteEntryName] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const effectiveLimit = limit || rowsPerPage;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * effectiveLimit;
  const endIndex = Math.min(currentPage * effectiveLimit, total);
  const resolvedTotalPages = totalPages || 1;

  const currentQuery = useMemo(() => {
    const q = { page: currentPage, limit: rowsPerPage };
    if (editionFilter) q.editionId = editionFilter;
    return q;
  }, [currentPage, rowsPerPage, editionFilter]);

  useEffect(() => {
    dispatch(getAllEditions({ limit: 100, sortBy: "editionNumber", sortOrder: "desc" }));
  }, [dispatch]);

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

  const handleEditClick = (entry) => {
    setModalMode("edit");
    setEditingEntry(entry);
    setOpenActionMenuId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setModalMode("create");
  };

  const handleDeleteClick = (entry) => {
    setIsModalOpen(false);
    setOpenActionMenuId(null);
    setDeleteEntryId(entry._id);
    setDeleteEntryName(entry.contactId?.fullName || "this entry");
    setIsDeleteOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteEntryId(null);
    setDeleteEntryName("");
  };

  const handleConfirmDelete = async () => {
    const entryId = deleteEntryId;
    try {
      const res = await dispatch(deleteEventHistory(entryId)).unwrap();
      showSuccess(res?.message || "Event history entry deleted successfully");
      dispatch(getAllEventHistory(currentQuery));
      dispatch(clearContactEventHistoryState());
    } catch (err) {
      showError(getErrorText(err, "Failed to delete event history entry"));
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
        render: (entry) => entry.contactId?.fullName || "-",
      },
      {
        key: "mobile",
        label: "WhatsApp Number",
        render: (entry) => entry.contactId?.whatsappNumber || "-",
      },
      {
        key: "edition",
        label: "Edition",
        cellClassName: "eventHistoryPage__editionCell",
        render: (entry) => entry.editionId?.name || "-",
      },
      {
        key: "status",
        label: "Status",
        render: (entry) => (
          <span
            className={`eventHistoryPage__statusBadge eventHistoryPage__status--${(
              entry.status || ""
            ).replace(/\s+/g, "")}`}
          >
            {entry.status || "-"}
          </span>
        ),
      },
      {
        key: "notes",
        label: "Notes",
        cellClassName: "eventHistoryPage__notesCell",
        render: (entry) => entry.notes || "-",
      },
      {
        key: "createdAt",
        label: "Added On",
        render: (entry) => formatDateTime(entry.createdAt),
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
              <button
                type="button"
                className="eventHistoryAction__item eventHistoryAction__itemEdit"
                onClick={() => handleEditClick(entry)}
              >
                Edit
              </button>
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
    [openActionMenuId, handleToggleActionMenu]
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
                editEntry={editingEntry}
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
            value={editionFilter}
            onChange={(e) => {
              setEditionFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Editions"
            options={(editions || []).map((ed) => ({ value: ed._id, label: ed.name }))}
          />
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
