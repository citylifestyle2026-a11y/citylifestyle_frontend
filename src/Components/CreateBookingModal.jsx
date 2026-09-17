import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import "../assets/CSS/CreateBookingModal.css";
import { createBooking } from "../redux/booking/bookingThunk";
import { clearBookingState } from "../redux/booking/bookingSlice";
import { getAllEvents } from '../redux/event/eventThunk';
import { getAllTicketTypes } from '../redux/ticketType/ticketTypeThunk'
import { showError, showSuccess } from "../utilits/toast";
const initialFormData = {
  eventId: "",
  ticketType: "",
  qty: "",
  amount: "",
  name: "",
  mobile: "",
  email: "",
  discount: "0",
  remark: "",
};
export default function CreateBookingModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [ticketTypes, setTicketTypes] = useState([]);
  const { events } = useSelector((state) => state.event);
  const activeEvent = events?.find((event) => event.isActive === true);
  const [fieldErrors, setFieldErrors] = useState({});
  // Returns a { fieldName: message } map instead of a single message so
  // each error can render directly below its own field, per the project's
  // validation pattern (see EditProfileModal). Only falls back to a toast
  // for things that aren't tied to one specific field.
  const validateForm = () => {
    const errors = {};

    if (!formData.eventId) errors.eventId = "Please select an event.";

    if (!formData.ticketType) errors.ticketType = "Please select a ticket.";

    // Final 1–availableCount check, run right before create so an invalid
    // qty (including one that only became invalid after a ticket-type
    // switch) can never reach the API, independent of the live clamping
    // already done in handleQtyChange/handleTicketChange below.
    const selectedTicketForValidation = ticketTypes.find(
      (ticket) => ticket._id === formData.ticketType
    );
    const availableCountForValidation = selectedTicketForValidation?.availableCount;

    if (!formData.qty || Number(formData.qty) <= 0) {
      errors.qty = "Please enter a valid quantity.";
    } else if (
      typeof availableCountForValidation === "number" &&
      Number(formData.qty) > availableCountForValidation
    ) {
      errors.qty = `Only ${availableCountForValidation} ticket(s) available.`;
    }

    if (!formData.name.trim()) {
      errors.name = "Please enter name.";
    } else if (!/^[A-Za-z ]+$/.test(formData.name)) {
      errors.name = "Name is invalid.";
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobile))
      errors.mobile = "Please enter a valid mobile number.";

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errors.email = "Please enter a valid email.";

    if (Number(formData.discount) < 0)
      errors.discount = "Discount cannot be negative.";
    else if (Number(formData.discount) > Number(formData.amount || 0))
      errors.discount = "Discount cannot exceed the amount.";

    setFieldErrors(errors);
    return errors;
  };
  // event redux
  useEffect(() => {
    if (!events?.length) return;

    const activeEvent = events.find(
      (event) => event.isActive === true
    );

    if (!activeEvent) {
      setFormData(initialFormData);
      setTicketTypes([]);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      eventId: activeEvent._id,
      ticketType: "",
      qty: "",
      amount: "",
    }));

    dispatch(
      getAllTicketTypes({
        eventId: activeEvent._id,
        page: 1,
        limit: 100,
      })
    ).then((response) => {
      if (getAllTicketTypes.fulfilled.match(response)) {
        setTicketTypes(response.payload.ticketTypes || []);
      } else {
        showError("Unable to load ticket types.");
      }
    });
  }, [events, dispatch]);
  const { createLoading } = useSelector((state) => state.booking);
  const [formData, setFormData] = useState(initialFormData);
  // handele event changes
  const handleEventChange = async (e) => {
    const eventId = e.target.value;

    setFormData((prev) => ({
      ...prev,
      eventId,
      ticketType: "",
      qty: "",
      amount: "",
    }));

    setTicketTypes([]);
    setFieldErrors((prev) => ({ ...prev, eventId: undefined, ticketType: undefined }));

    if (!eventId) return;

    const response = await dispatch(
      getAllTicketTypes({
        eventId,
        page: 1,
        limit: 100,
      })
    );

    if (getAllTicketTypes.fulfilled.match(response)) {
      setTicketTypes(response.payload.ticketTypes || []);
    } else {
      showError("Unable to load ticket types.");
    }
  };
  // handel qty changes
  const handleQtyChange = (e) => {
    const rawValue = e.target.value;

    const selectedTicket = ticketTypes.find(
      (ticket) => ticket._id === formData.ticketType
    );

    const ticketPrice = selectedTicket?.amount || 0;
    const availableCount = selectedTicket?.availableCount;

    // Let the user clear the field while editing — validateForm() already
    // rejects an empty qty at submit time, so this isn't a validation gap.
    if (rawValue === "") {
      setFormData((prev) => ({ ...prev, qty: "", amount: 0 }));
      setFieldErrors((prev) => (prev.qty ? { ...prev, qty: undefined } : prev));
      return;
    }

    let qty = Number(rawValue);
    if (Number.isNaN(qty)) return;

    // Never below 1 — covers both manual typing and the native spinner's
    // down-arrow, so qty can never reach 0.
    qty = Math.max(1, qty);
    // Never above the selected ticket's availableCount — covers both
    // manual typing and the native spinner's up-arrow.
    if (typeof availableCount === "number") {
      qty = Math.min(qty, availableCount);
    }

    setFormData((prev) => ({
      ...prev,
      qty,
      amount: qty * ticketPrice,
    }));
    setFieldErrors((prev) => (prev.qty ? { ...prev, qty: undefined } : prev));
  };
  // handel ticket change
  const handleTicketChange = (e) => {
    const ticketId = e.target.value;

    const selectedTicket = ticketTypes.find(
      (ticket) => ticket._id === ticketId
    );

    const price = selectedTicket?.amount || 0;
    const availableCount = selectedTicket?.availableCount;

    setFormData((prev) => {
      // Re-clamp an already-entered qty to the newly selected ticket's
      // availableCount — only ever brings it down if it's now out of
      // range, never raises it, and leaves an empty qty untouched.
      let qty = prev.qty;
      if (qty !== "" && typeof availableCount === "number") {
        qty = Math.min(Number(qty) || 0, availableCount);
      }

      return {
        ...prev,
        ticketType: ticketId,
        qty,
        amount: (Number(qty) || 0) * price,
      };
    });
    setFieldErrors((prev) => (prev.ticketType ? { ...prev, ticketType: undefined } : prev));
  };
  // handel change
  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear that field's inline error as soon as the user edits it, so the
    // message doesn't linger after they've corrected it but before the
    // next submit attempt re-validates.
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };
  // handel create 
  const handleCreate = async () => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      // Field-specific messages render below their inputs (see JSX below);
      // no generic toast here since every error above is attributable to
      // a specific field.
      return;
    }

    const payload = {
      eventId: formData.eventId,
      ticketTypeId: formData.ticketType,
      quantity: Number(formData.qty),
      amount: Number(totalPay),
      name: formData.name.trim(),
      mobileNumber: formData.mobile.trim(),
      email: formData.email.trim(),
      discount: Number(formData.discount),
      remark: formData.remark.trim(),
    };

    try {
      const response = await dispatch(createBooking(payload)).unwrap();

      showSuccess(response.message || "Booking created successfully.");

      setFormData(initialFormData);
      setTicketTypes([]);
      dispatch(clearBookingState());
      onSuccess();
      onClose();

    } catch (err) {
      // `.unwrap()` throws the same string set as createError below, so
      // this is the single place that shows the create-failure toast —
      // there's no separate effect watching createError, which would
      // otherwise fire a second, duplicate toast for the same failure.
      showError(
        typeof err === "string" ? err : err?.message || "Failed to create booking."
      );
      dispatch(clearBookingState());
    }
  };
  useEffect(() => {
    // The Booking page already loads the full events list into this same
    // Redux slice before this modal can be opened. Only fetch here if
    // that hasn't happened (e.g. the modal is opened from elsewhere), so
    // opening the modal doesn't always trigger a duplicate request.
    if (events?.length) return;

    dispatch(
      getAllEvents({
        page: 1,
        limit: 1000,
        search: "",
      })
    );
  }, [dispatch, events]);
  // discount
  const subtotal = Number(formData.amount || 0);
  const discount = Number(formData.discount || 0);
  const totalPay = Math.max(subtotal - discount, 0);

  // Drives the Qty input's max attribute below, so the native
  // increment/decrement spinner itself also respects the selected
  // ticket's availableCount, on top of the clamping already done in
  // handleQtyChange/handleTicketChange.
  const selectedTicketForQty = ticketTypes.find(
    (ticket) => ticket._id === formData.ticketType
  );
  const availableCountForQty = selectedTicketForQty?.availableCount;
  return (
    <div className="bookingCreateOverlay" onClick={onClose}>
      <div className="bookingCreateContainer" onClick={(e) => e.stopPropagation()}>
        <div className="bookingCreateHeader">
          <h2 className="bookingCreateTitle">Book Ticket</h2>
          <button
            type="button"
            className="bookingCreateCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        <div className="bookingCreateGrid">
          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Event <span className="bookingCreateRequired">*</span>
            </label>
            <select
              className="bookingCreateSelect"
              value={formData.eventId}
              onChange={handleEventChange}
            >
              <option value="">Select Event</option>
              {events
                ?.filter((event) => event.isActive === true)
                .map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title}
                  </option>
                ))}
            </select>
            {fieldErrors.eventId && (
              <p className="bookingCreateFieldError">{fieldErrors.eventId}</p>
            )}
          </div>
          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Ticket <span className="bookingCreateRequired">*</span>
            </label>
            <select
              className="bookingCreateSelect"
              value={formData.ticketType}
              onChange={handleTicketChange}
            >
              <option value="">
                Select Ticket
              </option>
              {
                ticketTypes.map((ticket) => (
                  <option
                    key={ticket._id}
                    value={ticket._id}
                  >
                    {ticket.ticketName}
                  </option>
                ))
              }
            </select>
            {fieldErrors.ticketType && (
              <p className="bookingCreateFieldError">{fieldErrors.ticketType}</p>
            )}
          </div>
          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Qty <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={
                typeof availableCountForQty === "number"
                  ? availableCountForQty
                  : undefined
              }
              className="bookingCreateInput"
              placeholder="Qty"
              value={formData.qty}
              onChange={handleQtyChange}
            />
            {fieldErrors.qty && (
              <p className="bookingCreateFieldError">{fieldErrors.qty}</p>
            )}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Amount <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="text"
              className="bookingCreateInput"
              placeholder="Amount"
              value={formData.amount}
              readOnly
            />
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Name <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="text"
              className="bookingCreateInput"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange("name")}
            />
            {fieldErrors.name && (
              <p className="bookingCreateFieldError">{fieldErrors.name}</p>
            )}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Mobile Number <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="number"
              className="bookingCreateInput"
              placeholder="Mobile Number"
              value={formData.mobile}
              onChange={handleChange("mobile")}
            />
            {fieldErrors.mobile && (
              <p className="bookingCreateFieldError">{fieldErrors.mobile}</p>
            )}
          </div>

          <div className="bookingCreateFieldGroup bookingCreateFullRow">
            <label className="bookingCreateLabel">Email Id</label>
            <input
              type="email"
              className="bookingCreateInput"
              placeholder="Email Id"
              value={formData.email}
              onChange={handleChange("email")}
            />
            {fieldErrors.email && (
              <p className="bookingCreateFieldError">{fieldErrors.email}</p>
            )}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">Discount</label>
            <input
              type="number"
              min="0"
              className="bookingCreateInput"
              value={formData.discount}
              onChange={handleChange("discount")}
            />
            {fieldErrors.discount && (
              <p className="bookingCreateFieldError">{fieldErrors.discount}</p>
            )}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">Remark</label>
            <input
              type="text"
              className="bookingCreateInput"
              placeholder="Remark"
              value={formData.remark}
              onChange={handleChange("remark")}
            />
          </div>
        </div>

        <div className="bookingCreateFooter">
          <div className="bookingCreateTotals">
            <div className="bookingCreateTotalBlock">
              <span className="bookingCreateTotalLabel">TOTAL</span>
              <span className="bookingCreateTotalValue">( * Rs.):₹ {subtotal} </span>
              <span className="bookingCreateDiscountNote">Discount: ₹ {discount}</span>
            </div>

            <div className="bookingCreateTotalBlock">
              <span className="bookingCreateTotalLabel">TOTAL PAY</span>
              <span className="bookingCreateTotalPayValue">RS.₹ {totalPay}</span>
            </div>
          </div>

          <div className="bookingCreateActions">
            <button
              type="button"
              className="bookingCreateCloseButton"
              onClick={onClose}
              disabled={createLoading}
            >
              Close
            </button>
            <button
              type="button"
              className="bookingCreateCreateButton"
              onClick={handleCreate}
              disabled={createLoading}
            >
              {createLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}