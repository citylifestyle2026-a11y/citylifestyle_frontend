import React, { useState, useEffect } from "react";
import "../assets/CSS/CreateTicketTypeModal.css";
import { useDispatch, useSelector } from "react-redux";
import { createTicketType, updateTicketType, getAllTicketTypes } from "../redux/ticketType/ticketTypeThunk";
import { clearTicketTypeState } from "../redux/ticketType/ticketTypeSlice";
import dayjs from "dayjs";
import MultipleDatePicker from "../Components/MultipleDatePicker";
import { showSuccess, showError } from "../utilits/toast";

// Extracts a plain "YYYY-MM-DD" calendar date from either an ISO date
// string from the API (e.g. "2026-08-11T00:00:00.000Z") or a Date instance
// from the calendar (react-day-picker represents a selected day as a
// *local*-midnight Date). These two need different handling:
// - ISO strings are sliced directly — never routed through `new Date()` +
//   getters, since that conversion can shift the date by a day depending
//   on the viewer's timezone offset relative to UTC.
// - Date instances use LOCAL getters (not UTC) — they already represent
//   the exact local calendar day the user clicked, so converting via UTC
//   getters would shift it backward for timezones ahead of UTC (e.g. IST).
const toDateOnlyString = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return toDateOnlyString(parsed);
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "YYYY-MM-DD" -> a local-midnight Date instance, matching how
// react-day-picker represents calendar days internally, so range bounds
// passed into it are never off by a timezone conversion.
const parseDateOnlyToLocalDate = (dateOnly) => {
  if (!dateOnly) return null;
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "YYYY-MM-DD" -> "DD-MM-YYYY" for user-facing messages.
const formatDisplayDate = (dateOnly) => {
  if (!dateOnly) return "";
  const [y, m, d] = dateOnly.split("-");
  return `${d}-${m}-${y}`;
};

const CreateTicketTypeModal = ({
  isOpen = true,
  onClose = () => { },
  eventId = null,
  eventName,
  eventStartDate = null,
  eventEndDate = null,
  eventDatesLoading = false,
  isEditMode = false,
  selectedTicketType = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
}) => {
  const dispatch = useDispatch();

  const { loading, success, error } = useSelector((state) => state.ticketType);

  const [formData, setFormData] = useState({
    ticketName: "",
    allowDayCount: "",
    amount: "",
    allowDates: [],
    availableCount: "",
    description: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // ================= EVENT DATE RANGE (for Allow Dates) =================
  const eventStartDateOnly = toDateOnlyString(eventStartDate);
  const eventEndDateOnly = toDateOnlyString(eventEndDate);
  const hasValidEventRange = Boolean(eventStartDateOnly && eventEndDateOnly);

  // Local-midnight Date instances for the calendar's native min/max
  // disabling — react-day-picker's `disabled` matcher expects real Date
  // objects, and these must be local-midnight to match how it represents
  // the dates the user actually clicks (see MultipleDatePicker.jsx).
  const eventStartDateObj = parseDateOnlyToLocalDate(eventStartDateOnly);
  const eventEndDateObj = parseDateOnlyToLocalDate(eventEndDateOnly);

  // formData.allowDates entries are Date objects from the calendar (see
  // MultipleDatePicker.jsx's onChange) — normalize before comparing.
  const isDateWithinEventRange = (rawDate) => {
    if (!hasValidEventRange) return false;
    const dateOnly = toDateOnlyString(rawDate);
    return Boolean(dateOnly) && dateOnly >= eventStartDateOnly && dateOnly <= eventEndDateOnly;
  };

  const eventRangeErrorMessage = eventDatesLoading
    ? "Loading event dates..."
    : hasValidEventRange
      ? `Allow Dates must be between ${formatDisplayDate(eventStartDateOnly)} and ${formatDisplayDate(eventEndDateOnly)}.`
      : "Event dates are not available.";

  // ================= PREFILL ON EDIT =================
  useEffect(() => {
    if (isEditMode && selectedTicketType) {
      setFormData({
        ticketName: selectedTicketType.ticketName ?? "",
        // `??` (not `||`) so a legitimate 0 value is prefilled as 0
        // instead of being wiped to an empty string — `0 || ""` evaluates
        // to "" since 0 is falsy, which is wrong here.
        allowDayCount: selectedTicketType.allowDayCount ?? "",
        amount: selectedTicketType.amount ?? "",
        // API returns allowDates as ISO date strings, but the calendar
        // (react-day-picker + date-fns `format`) needs real local-midnight
        // Date instances to recognize them as "selected" and to format
        // them — passing the raw strings through left the picker showing
        // no selection and could throw inside date-fns' format(). Reuse
        // the same string->local-Date conversion used everywhere else in
        // this file so it matches exactly how newly-picked dates are
        // represented.
        allowDates: (selectedTicketType.allowDates || [])
          .map((d) => parseDateOnlyToLocalDate(toDateOnlyString(d)))
          .filter(Boolean),
        availableCount: selectedTicketType.availableCount ?? "",
        description: selectedTicketType.description ?? "",
      });
    } else {
      setFormData({
        ticketName: "",
        allowDayCount: "",
        amount: "",
        allowDates: [],
        availableCount: "",
        description: "",
      });
    }
    setFormErrors({});
  }, [isEditMode, selectedTicketType]);

  // ================= ALLOW DATES CHANGE (event-range enforced) =================
  // MultipleDatePicker is given minDate/maxDate below so react-day-picker's
  // own `disabled` matcher blocks clicking a new invalid date in the grid.
  // This handler is still the guaranteed backstop for anything that gets
  // through — but it must NOT blanket-filter the whole array: an existing
  // Ticket Type being edited may already have dates that no longer fall in
  // the Event's (possibly since-changed) range, and those must stay
  // selected as-is rather than being silently dropped. Only brand-new
  // selections are gated against the range.
  const handleAllowDatesChange = (dates) => {
    const incoming = Array.isArray(dates) ? dates : [];
    const prevDates = formData.allowDates;
    const prevKeys = new Set(prevDates.map(toDateOnlyString));

    const kept = incoming.filter((d) => prevKeys.has(toDateOnlyString(d)));
    const added = incoming.filter((d) => !prevKeys.has(toDateOnlyString(d)));
    const validAdded = added.filter(isDateWithinEventRange);
    const rejectedSome = validAdded.length !== added.length;

    const updated = { ...formData, allowDates: [...kept, ...validAdded] };
    setFormData(updated);

    // Live-validate immediately: at least one date, Allow Day Count vs
    // selected date count, no past dates, and within the Event's range.
    // If the calendar just blocked an out-of-range click, that takes
    // priority over the other checks (matches the previous behavior).
    const liveError = rejectedSome
      ? eventRangeErrorMessage
      : getAllowDatesError(updated);

    setFormErrors((prev) => ({ ...prev, allowDates: liveError }));
  };

  // ================= LIVE FIELD VALIDATION =================
  // Same rules and same messages as the final-submit validate() below —
  // these are the single source of truth for both, so live (on-change)
  // validation and submit validation can never disagree. `data` is a full
  // formData snapshot (not just the one changed field) because Allow
  // Dates' rules depend on Allow Day Count, and vice versa.
  const getAllowDatesError = (data) => {
    let error = "";

    if (data.allowDates.length === 0) {
      error = "Please select at least one date";
    }

    if (Number(data.allowDayCount) !== data.allowDates.length) {
      error = "Allow Day Count must match selected dates";
    }

    // Mirrors the backend's past-date rejection so the user gets
    // immediate feedback instead of a failed submit round-trip.
    const today = dayjs().startOf("day");
    const hasPastDate = data.allowDates.some((date) =>
      dayjs(date).isBefore(today)
    );

    if (hasPastDate) {
      error = "Allow Dates cannot include a date that has already passed";
    }

    // Every selected date must fall within the Event's own start/end range.
    if (!error) {
      const outOfRange = data.allowDates.some(
        (date) => !isDateWithinEventRange(date)
      );
      if (outOfRange) {
        error = eventRangeErrorMessage;
      }
    }

    return error;
  };

  const getFieldError = (name, data) => {
    switch (name) {
      case "ticketName":
        return !data.ticketName.trim() ? "Ticket name is required" : "";
      case "allowDayCount":
        // `data.allowDayCount === ""` (not `!data.allowDayCount`) so a
        // valid 0 isn't flagged as missing — only an actually-empty field
        // is "required".
        if (data.allowDayCount === "" || data.allowDayCount === null || data.allowDayCount === undefined)
          return "Allow day count is required";
        return Number(data.allowDayCount) < 0 ? "Allow day count cannot be negative" : "";
      case "allowDates":
        return getAllowDatesError(data);
      case "amount":
        if (data.amount === "" || data.amount === null || data.amount === undefined)
          return "Amount is required";
        return Number(data.amount) < 0 ? "Amount cannot be negative" : "";
      case "availableCount":
        return (data.availableCount === "" || data.availableCount === null || data.availableCount === undefined)
          ? "Available count is required"
          : "";
      case "description":
        return !data.description.trim() ? "Description is required" : "";
      default:
        return "";
    }
  };

  // ================= HANDLE FIELD CHANGE (LIVE VALIDATION) =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    setFormData(updated);

    setFormErrors((prev) => {
      const next = { ...prev, [name]: getFieldError(name, updated) };

      // Allow Day Count and Allow Dates validate against each other, so
      // changing Allow Day Count must immediately re-check Allow Dates'
      // error too, not just Allow Day Count's own error.
      if (name === "allowDayCount") {
        next.allowDates = getAllowDatesError(updated);
      }

      return next;
    });
  };

  // ================= VALIDATION (FINAL SUBMIT) =================
  const validate = () => {
    const errors = {
      ticketName: getFieldError("ticketName", formData),
      allowDayCount: getFieldError("allowDayCount", formData),
      allowDates: getFieldError("allowDates", formData),
      amount: getFieldError("amount", formData),
      availableCount: getFieldError("availableCount", formData),
      description: getFieldError("description", formData),
    };

    Object.keys(errors).forEach((key) => {
      if (!errors[key]) delete errors[key];
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ================= HANDLE SUBMIT (CREATE / UPDATE) =================
  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      eventId: selectedTicketType?.eventId || eventId,
      ticketName: formData.ticketName,
      allowDayCount: Number(formData.allowDayCount),
      amount: Number(formData.amount),
      // formData.allowDates holds raw Date objects from MultipleDatePicker
      // (react-day-picker), NOT strings. Sending Date objects straight
      // into a JSON request body is the actual bug: JSON.stringify calls
      // Date.prototype.toJSON(), which is UTC-based, so a local midnight
      // Date in a timezone ahead of UTC (e.g. IST, UTC+5:30) silently
      // shifts back to the *previous* day once it hits the backend —
      // pick 10th, and 9th gets saved. Converting with toDateOnlyString
      // (local getters, not toISOString) locks in the calendar day the
      // user actually clicked before it ever reaches JSON.stringify.
      allowDates: formData.allowDates.map(toDateOnlyString).filter(Boolean),
      availableCount: Number(formData.availableCount),
      description: formData.description,
    };

    if (isEditMode && selectedTicketType?._id) {
      dispatch(updateTicketType({ id: selectedTicketType._id, data: payload }));
    } else {
      dispatch(createTicketType(payload));
    }
  };

  // ================= SUCCESS HANDLING =================
  useEffect(() => {
    if (success) {
      showSuccess(
        isEditMode
          ? "Ticket type updated successfully"
          : "Ticket type created successfully"
      );

      // Refetch using the list's actual current page/limit/search instead
      // of hardcoded defaults, so create/edit no longer silently resets
      // the user's pagination and search.
      dispatch(
        getAllTicketTypes({
          eventId,
          page: currentPage,
          limit: rowsPerPage,
          search,
        })
      );

      onClose();

      dispatch(clearTicketTypeState());
    }
  }, [success, dispatch, eventId, currentPage, rowsPerPage, search, onClose, isEditMode]);

  // ================= ERROR HANDLING =================
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error]);

  // ================= RESET STATE ON CLOSE =================
  const handleClose = () => {
    dispatch(clearTicketTypeState());
    setFormErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = isEditMode ? "Edit Ticket Type" : "Add Ticket Type";
  const submitLabel = isEditMode ? "Save" : "Create";

  return (
    <div className="ticketTypeCreate-overlay">
      <div
        className="ticketTypeCreate-modal"
        key={selectedTicketType ? selectedTicketType._id : "new"}
      >
        <div className="ticketTypeCreate-header">
          <h2 className="ticketTypeCreate-title">
            {modalTitle} <span className="ticketTypeCreate-eventName">({eventName})</span>
          </h2>
          <button
            type="button"
            className="ticketTypeCreate-closeIcon"
            onClick={handleClose}
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        <div className="ticketTypeCreate-body">
          {error && <p className="ticketTypeCreate-error">{error}</p>}

          <div className="ticketTypeCreate-field">
            <label className="ticketTypeCreate-label">
              Ticket Name <span className="ticketTypeCreate-required">*</span>
            </label>
            <input
              type="text"
              name="ticketName"
              value={formData.ticketName}
              onChange={handleChange}
              className="ticketTypeCreate-input"
              placeholder="Ticket Name"
            />
            {formErrors.ticketName && (
              <span className="ticketTypeCreate-fieldError">{formErrors.ticketName}</span>
            )}
          </div>

          <div className="ticketTypeCreate-row">
            <div className="ticketTypeCreate-field ticketTypeCreate-fieldHalf">
              <label className="ticketTypeCreate-label">
                Allow Day count <span className="ticketTypeCreate-required">*</span>
              </label>
              <input
                type="number"
                name="allowDayCount"
                value={formData.allowDayCount}
                onChange={handleChange}
                className="ticketTypeCreate-input"
                placeholder="Allow Day Count"
                min="0"
              />
              {formErrors.allowDayCount && (
                <span className="ticketTypeCreate-fieldError">{formErrors.allowDayCount}</span>
              )}
            </div>

            <div className="ticketTypeCreate-field ticketTypeCreate-fieldHalf">
              <label className="ticketTypeCreate-label">
                Amount <span className="ticketTypeCreate-required">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="ticketTypeCreate-input"
                placeholder="Amount"
                min="0"
              />
              {formErrors.amount && (
                <span className="ticketTypeCreate-fieldError">{formErrors.amount}</span>
              )}
            </div>
          </div>
          {/* date */}
          <div className="ticketTypeCreate-field">
            <label className="ticketTypeCreate-label">
              Allow Dates <span className="ticketTypeCreate-required">*</span>
            </label>

            <MultipleDatePicker
              value={formData.allowDates}
              onChange={handleAllowDatesChange}
              minDate={eventStartDateObj}
              maxDate={eventEndDateObj}
              disabled={!hasValidEventRange}
            />

            {formErrors.allowDates && (
              <span className="ticketTypeCreate-fieldError">
                {formErrors.allowDates}
              </span>
            )}
          </div>

          <div className="ticketTypeCreate-field">
            <label className="ticketTypeCreate-label">
              Available Count <span className="ticketTypeCreate-required">*</span>
            </label>
            <input
              type="number"
              name="availableCount"
              value={formData.availableCount}
              onChange={handleChange}
              className="ticketTypeCreate-input"
              placeholder="Available Count"
            />
            {formErrors.availableCount && (
              <span className="ticketTypeCreate-fieldError">{formErrors.availableCount}</span>
            )}
          </div>

          <div className="ticketTypeCreate-field">
            <label className="ticketTypeCreate-label">
              Description <span className="ticketTypeCreate-required">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="ticketTypeCreate-textarea"
              rows={4}
              placeholder="Description"
            />
            {formErrors.description && (
              <span className="ticketTypeCreate-fieldError">{formErrors.description}</span>
            )}
          </div>
        </div>

        <div className="ticketTypeCreate-footer">
          <button
            type="button"
            className="ticketTypeCreate-closeBtn"
            onClick={handleClose}
          >
            Close
          </button>
          <button
            type="button"
            className="ticketTypeCreate-createBtn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (isEditMode ? "Saving..." : "Creating...") : submitLabel}
          </button>
        </div>
      </div>
    </div >
  );
};

export default CreateTicketTypeModal;