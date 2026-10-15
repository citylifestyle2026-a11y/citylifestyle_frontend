import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { FaTimes } from "react-icons/fa";
import "../assets/CSS/CreateBookingModal.css";
import { updateBooking } from "../redux/booking/bookingThunk";
import { getAllTicketTypes } from "../redux/ticketType/ticketTypeThunk";
import { showError, showSuccess, showWarning } from "../utilits/toast";
import {
  isValidMobileNumber,
  MOBILE_ERROR_MESSAGE,
  normalizeMobileNumber,
  sanitizeMobileInput,
} from "../utilits/mobileNumber";

// Edit an existing booking (opened from Booking page -> Action -> Edit Booking).
// `booking` is the row from the bookings list (populated eventId/ticketTypeId).
// - Event is fixed.
// - Quantity / ticket type are editable only for single-QR bookings.
// - After saving, the pass link stays the same; optionally re-send the
//   WhatsApp invitation (auto-ticked when mobile / qty / ticket changed).
export default function EditBookingModal({ booking, onClose, onSuccess }) {
  const dispatch = useDispatch();

  const eventId = booking.eventId?._id || booking.eventId;
  const originalTicketId = booking.ticketTypeId?._id || booking.ticketTypeId;
  const isSingleQr = booking.entryMode === "single_qr";

  const [ticketTypes, setTicketTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [resend, setResend] = useState(false);
  const [resendTouched, setResendTouched] = useState(false);

  const [formData, setFormData] = useState({
    ticketType: originalTicketId,
    qty: booking.quantity,
    name: booking.name || "",
    mobile: booking.mobileNumber || "",
    email: booking.email || "",
    companyName: booking.companyName || "",
    discount: String(booking.discount ?? 0),
    remark: booking.remark || "",
  });

  useEffect(() => {
    dispatch(getAllTicketTypes({ eventId, page: 1, limit: 100 })).then((response) => {
      if (getAllTicketTypes.fulfilled.match(response)) {
        setTicketTypes(response.payload.ticketTypes || []);
      } else {
        showError("Unable to load ticket types.");
      }
    });
  }, [dispatch, eventId]);

  const selectedTicket = ticketTypes.find((t) => t._id === formData.ticketType);
  const sameType = formData.ticketType === originalTicketId;
  // This booking's own seats are free to be re-used when the type is unchanged.
  const maxQty =
    typeof selectedTicket?.availableCount === "number"
      ? selectedTicket.availableCount + (sameType ? booking.quantity : 0)
      : undefined;

  const qty = Number(formData.qty) || 0;
  const subtotal = (selectedTicket?.amount ?? booking.ticketTypeId?.amount ?? 0) * qty;
  const discount = Number(formData.discount || 0);
  const totalPay = Math.max(subtotal - discount, 0);

  const mobileChanged =
    normalizeMobileNumber(formData.mobile) !== normalizeMobileNumber(booking.mobileNumber);
  const structuralChanged = qty !== booking.quantity || !sameType;

  // Suggest a WhatsApp resend whenever something the guest should know changed.
  useEffect(() => {
    if (!isSingleQr || resendTouched) return;
    setResend(mobileChanged || structuralChanged);
  }, [isSingleQr, resendTouched, mobileChanged, structuralChanged]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (field === "mobile") setDuplicateFound(false);
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleQtyChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setFormData((prev) => ({ ...prev, qty: "" }));
      return;
    }
    let next = Math.max(1, Number(raw));
    if (Number.isNaN(next)) return;
    if (typeof maxQty === "number") next = Math.min(next, maxQty);
    setFormData((prev) => ({ ...prev, qty: next }));
    setFieldErrors((prev) => (prev.qty ? { ...prev, qty: undefined } : prev));
  };

  const handleTicketChange = (e) => {
    const ticketId = e.target.value;
    setDuplicateFound(false);
    setFormData((prev) => ({ ...prev, ticketType: ticketId }));
    const next = ticketTypes.find((t) => t._id === ticketId);
    const cap =
      typeof next?.availableCount === "number"
        ? next.availableCount + (ticketId === originalTicketId ? booking.quantity : 0)
        : undefined;
    if (typeof cap === "number" && Number(formData.qty) > cap) {
      setFormData((prev) => ({ ...prev, qty: cap }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.ticketType) errors.ticketType = "Please select a ticket.";
    if (!qty || qty <= 0) errors.qty = "Please enter a valid quantity.";
    else if (typeof maxQty === "number" && qty > maxQty)
      errors.qty = `Only ${maxQty} ticket(s) available.`;

    if (!formData.name.trim()) errors.name = "Please enter name.";
    else if (!/^[A-Za-z ]+$/.test(formData.name)) errors.name = "Name is invalid.";

    if (!isValidMobileNumber(formData.mobile)) errors.mobile = MOBILE_ERROR_MESSAGE;

    // Company / Brand is compulsory (same rule + message as CreateBookingModal).
    if (!formData.companyName.trim())
      errors.companyName = "Please enter company / brand name.";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Please enter a valid email.";

    if (discount < 0) errors.discount = "Discount cannot be negative.";
    else if (discount > subtotal) errors.discount = "Discount cannot exceed the amount.";

    setFieldErrors(errors);
    return errors;
  };

  const handleSave = async (allowDuplicate = false) => {
    if (Object.keys(validate()).length > 0) return;

    const data = {
      name: formData.name.trim(),
      mobileNumber: normalizeMobileNumber(formData.mobile),
      email: formData.email.trim(),
      companyName: formData.companyName.trim(),
      discount,
      remark: formData.remark.trim(),
      resendInvitation: isSingleQr && resend,
      ...(isSingleQr ? { quantity: qty, ticketTypeId: formData.ticketType } : {}),
      ...(allowDuplicate ? { allowDuplicate: true } : {}),
    };

    setSaving(true);
    try {
      const response = await dispatch(updateBooking({ id: booking._id, data })).unwrap();
      const result = response?.data;

      showSuccess(response.message || "Booking updated successfully.");
      if (result?.whatsappError) {
        showWarning(`Booking saved, but the WhatsApp message failed: ${result.whatsappError}`);
      } else if (result?.whatsappSent) {
        showSuccess("Invitation re-sent on WhatsApp.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message = typeof err === "string" ? err : err?.message || "Failed to update booking.";
      if (/^duplicate booking/i.test(message)) {
        setDuplicateFound(true);
        showWarning(message);
        setFieldErrors((prev) => ({
          ...prev,
          mobile: "Duplicate booking — this mobile number already has a booking.",
        }));
      } else {
        showError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bookingCreateOverlay" onClick={onClose}>
      <div className="bookingCreateContainer" onClick={(e) => e.stopPropagation()}>
        <div className="bookingCreateHeader">
          <h2 className="bookingCreateTitle">Edit Booking {booking.bookingNumber}</h2>
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
            <input
              type="text"
              className="bookingCreateInput"
              value={booking.eventId?.title || ""}
              readOnly
              disabled
            />
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Ticket <span className="bookingCreateRequired">*</span>
            </label>
            <select
              className="bookingCreateSelect"
              value={formData.ticketType}
              onChange={handleTicketChange}
              disabled={!isSingleQr}
            >
              {ticketTypes.length === 0 && (
                <option value={originalTicketId}>
                  {booking.ticketTypeId?.ticketName || "Ticket"}
                </option>
              )}
              {ticketTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.ticketName}
                </option>
              ))}
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
              max={typeof maxQty === "number" ? maxQty : undefined}
              className="bookingCreateInput"
              value={formData.qty}
              onChange={handleQtyChange}
              disabled={!isSingleQr}
            />
            {fieldErrors.qty && <p className="bookingCreateFieldError">{fieldErrors.qty}</p>}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Amount <span className="bookingCreateRequired">*</span>
            </label>
            <input type="text" className="bookingCreateInput" value={subtotal} readOnly />
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Name <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="text"
              className="bookingCreateInput"
              value={formData.name}
              onChange={handleChange("name")}
            />
            {fieldErrors.name && <p className="bookingCreateFieldError">{fieldErrors.name}</p>}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">
              Mobile Number <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              className="bookingCreateInput"
              placeholder="Mobile Number (91 optional)"
              value={formData.mobile}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, mobile: sanitizeMobileInput(e.target.value) }));
                setDuplicateFound(false);
                setFieldErrors((prev) => (prev.mobile ? { ...prev, mobile: undefined } : prev));
              }}
            />
            {fieldErrors.mobile && <p className="bookingCreateFieldError">{fieldErrors.mobile}</p>}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">Email</label>
            <input
              type="email"
              className="bookingCreateInput"
              value={formData.email}
              onChange={handleChange("email")}
            />
            {fieldErrors.email && <p className="bookingCreateFieldError">{fieldErrors.email}</p>}
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
            <label className="bookingCreateLabel">
              Company / Brand <span className="bookingCreateRequired">*</span>
            </label>
            <input
              type="text"
              className="bookingCreateInput"
              placeholder="Company / Brand"
              value={formData.companyName}
              onChange={handleChange("companyName")}
            />
            {fieldErrors.companyName && (
              <p className="bookingCreateFieldError">{fieldErrors.companyName}</p>
            )}
          </div>

          <div className="bookingCreateFieldGroup">
            <label className="bookingCreateLabel">Remark</label>
            <input
              type="text"
              className="bookingCreateInput"
              value={formData.remark}
              onChange={handleChange("remark")}
            />
          </div>
        </div>

        {!isSingleQr && (
          <p className="bookingCreateFieldError" style={{ padding: "0 20px" }}>
            This booking uses the old registration-link flow, so Qty and Ticket cannot be
            changed. Other details can be edited.
          </p>
        )}

        {isSingleQr && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 20px" }}>
            <input
              type="checkbox"
              checked={resend}
              onChange={(e) => {
                setResendTouched(true);
                setResend(e.target.checked);
              }}
            />
            <span>Re-send invitation on WhatsApp after saving (same pass link)</span>
          </label>
        )}

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
            disabled={saving}
          >
            Close
          </button>
          {duplicateFound && (
            <button
              type="button"
              className="bookingCreateDuplicateButton"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              Save Anyway
            </button>
          )}
          <button
            type="button"
            className="bookingCreateCreateButton"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
