import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";

import { getContactById } from "../redux/contact/contactThunk";
import { getAllEditions } from "../redux/edition/editionThunk";
import {
  getEventHistoryByContact,
  createEventHistory,
  updateEventHistory,
  deleteEventHistory,
} from "../redux/contactEventHistory/contactEventHistoryThunk";
import { clearContactEventHistoryState } from "../redux/contactEventHistory/contactEventHistorySlice";

import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/EventHistory.css";

// Must stay in sync with backend/models/contactEventHistory.model.js's
// STATUS_VALUES (and validators/contactEventHistory.validator.js's own
// copy of the same list).
const STATUS_OPTIONS = [
  "Invited",
  "Confirmed",
  "Attended",
  "Not Attended",
  "Cancelled",
].map((value) => ({ value, label: value }));

const EMPTY_FORM = { editionId: "", status: "Invited", notes: "" };

// DD-MM-YYYY hh:mm AM/PM — same shape as ViewEvent.jsx's formatDateTime,
// used here for each entry's "Added On" column.
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
  const { contactId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { contact, loading: contactLoading } = useSelector(
    (state) => state.contact
  );
  const { editions } = useSelector((state) => state.edition);
  const { history, loading, error, actionLoading } = useSelector(
    (state) => state.contactEventHistory
  );

  // Inline form state (no modal — a card toggled open/closed on the
  // page itself). `mode` decides whether Save calls createEventHistory
  // or updateEventHistory; `editingId` is only set in edit mode.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);

  // Inline delete confirmation — which row (if any) is currently
  // showing its "Confirm delete?" state, instead of a popup modal.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (contactId) {
      dispatch(getContactById(contactId));
      dispatch(getEventHistoryByContact({ contactId, params: {} }));
    }
  }, [dispatch, contactId]);

  // Edition dropdown — existing Edition API, all editions fetched once
  // (same fetch-limit approach as NominationList.jsx's own edition
  // filter dropdown) so a closed/older edition can still be selected
  // for a past history entry, not just the currently Active one.
  useEffect(() => {
    dispatch(getAllEditions({ limit: 100, sortBy: "editionNumber", sortOrder: "desc" }));
  }, [dispatch]);

  const editionOptions = useMemo(
    () => (editions || []).map((edition) => ({ value: edition._id, label: edition.name })),
    [editions]
  );

  const handleBack = () => navigate("/contact-list");

  const handleAddClick = () => {
    setFormMode("create");
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setConfirmDeleteId(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (entry) => {
    setFormMode("edit");
    setEditingId(entry._id);
    setFormValues({
      editionId: entry.editionId?._id || entry.editionId || "",
      status: entry.status || "Invited",
      notes: entry.notes || "",
    });
    setConfirmDeleteId(null);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setFormMode("create");
    setEditingId(null);
    setFormValues(EMPTY_FORM);
  };

  const handleFormChange = (field) => (e) => {
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();

    if (!formValues.editionId) {
      showError("Please select an Edition");
      return;
    }

    try {
      if (formMode === "edit" && editingId) {
        const res = await dispatch(
          updateEventHistory({
            id: editingId,
            data: {
              editionId: formValues.editionId,
              status: formValues.status,
              notes: formValues.notes,
            },
          })
        ).unwrap();

        showSuccess(res.message || "Event history entry updated successfully");
      } else {
        const res = await dispatch(
          createEventHistory({
            contactId,
            editionId: formValues.editionId,
            status: formValues.status,
            notes: formValues.notes,
          })
        ).unwrap();

        showSuccess(res.message || "Event history entry added successfully");
      }

      dispatch(clearContactEventHistoryState());
      handleCancelForm();
    } catch (err) {
      showError(err || "Failed to save event history entry");
    }
  };

  const handleDeleteClick = (entryId) => {
    setIsFormOpen(false);
    setConfirmDeleteId(entryId);
  };

  const handleCancelDelete = () => setConfirmDeleteId(null);

  const handleConfirmDelete = async (entryId) => {
    try {
      const res = await dispatch(deleteEventHistory(entryId)).unwrap();
      showSuccess(res.message || "Event history entry deleted successfully");
      dispatch(clearContactEventHistoryState());
    } catch (err) {
      showError(err || "Failed to delete event history entry");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const historyTableColumns = useMemo(
    () => [
      {
        key: "edition",
        label: "Edition",
        sortable: false,
        cellClassName: "eventHistoryPage__editionCell",
        render: (entry) => entry.editionId?.name || "-",
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
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
        sortable: false,
        cellClassName: "eventHistoryPage__notesCell",
        render: (entry) => entry.notes || "-",
      },
      {
        key: "createdAt",
        label: "Added On",
        sortable: false,
        render: (entry) => formatDateTime(entry.createdAt),
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        render: (entry) =>
          confirmDeleteId === entry._id ? (
            <span className="eventHistoryPage__confirmDelete">
              Delete this entry?
              <button
                type="button"
                className="eventHistoryPage__confirmYes"
                onClick={() => handleConfirmDelete(entry._id)}
                disabled={actionLoading}
              >
                Yes
              </button>
              <button
                type="button"
                className="eventHistoryPage__confirmNo"
                onClick={handleCancelDelete}
                disabled={actionLoading}
              >
                No
              </button>
            </span>
          ) : (
            <span className="eventHistoryPage__rowActions">
              <button
                type="button"
                className="eventHistoryPage__rowActionBtn"
                onClick={() => handleEditClick(entry)}
              >
                Edit
              </button>
              <button
                type="button"
                className="eventHistoryPage__rowActionBtn eventHistoryPage__rowActionBtn--danger"
                onClick={() => handleDeleteClick(entry._id)}
              >
                Delete
              </button>
            </span>
          ),
      },
    ],
    [confirmDeleteId, actionLoading]
  );

  return (
    <CommonListLayout
      pageClassName="eventHistoryPage__page"
      mainAreaClassName="eventHistoryPage__mainArea"
      contentClassName="eventHistoryPage__content"
      headerTitle="Event History"
    >
      <CommonPageHeader
        containerClassName="eventHistoryPage__topRow"
        title={
          contactLoading
            ? "Event History"
            : `Event History — ${contact?.fullName || "Contact"}`
        }
        titleClassName="eventHistoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="eventHistoryPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span
              className="eventHistoryPage__breadcrumbLink"
              role="button"
              tabIndex={0}
              onClick={handleBack}
            >
              Contact List
            </span>
            <span>-</span>
            <span className="eventHistoryPage__breadcrumbActive">
              Event History
            </span>
          </div>
        }
        actions={
          <div className="eventHistoryPage__headerActions">
            <button
              type="button"
              className="eventHistoryPage__backButton"
              onClick={handleBack}
            >
              <FaArrowLeft />
              Back to Contact List
            </button>

            <button
              type="button"
              className="eventHistoryPage__createButton"
              onClick={handleAddClick}
            >
              <FaPlus />
              Add Details
            </button>
          </div>
        }
      />

      {isFormOpen && (
        <div className="eventHistoryForm__card">
          <h3 className="eventHistoryForm__title">
            {formMode === "edit" ? "Edit Event History" : "Add Event History"}
          </h3>

          <form className="eventHistoryForm__grid" onSubmit={handleSaveForm}>
            <div className="eventHistoryForm__field">
              <label className="eventHistoryForm__label" htmlFor="eventHistory-edition">
                Edition
              </label>
              <CommonSelect
                id="eventHistory-edition"
                className="eventHistoryForm__select"
                value={formValues.editionId}
                onChange={handleFormChange("editionId")}
                placeholder="Select Edition"
                options={editionOptions}
              />
            </div>

            <div className="eventHistoryForm__field">
              <label className="eventHistoryForm__label" htmlFor="eventHistory-status">
                Status
              </label>
              <CommonSelect
                id="eventHistory-status"
                className="eventHistoryForm__select"
                value={formValues.status}
                onChange={handleFormChange("status")}
                options={STATUS_OPTIONS}
              />
            </div>

            <div className="eventHistoryForm__field eventHistoryForm__fieldFull">
              <label className="eventHistoryForm__label" htmlFor="eventHistory-notes">
                Notes
              </label>
              <textarea
                id="eventHistory-notes"
                className="eventHistoryForm__textarea"
                rows={3}
                value={formValues.notes}
                onChange={handleFormChange("notes")}
                placeholder="Optional notes..."
              />
            </div>

            <div className="eventHistoryForm__actions">
              <button
                type="button"
                className="eventHistoryForm__cancelButton"
                onClick={handleCancelForm}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="eventHistoryForm__saveButton"
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="eventHistoryPage__tableCard">
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
                message="No event history found for this contact."
              />
            }
            stateCellClassName="eventHistoryPage__stateCell"
            stateCellStyle={{}}
            tableClassName="eventHistoryPage__table"
            thContentClassName="eventHistoryPage__thContent"
            sortIconClassName="eventHistoryPage__sortIcon"
          />
        </div>
      </div>
    </CommonListLayout>
  );
}
