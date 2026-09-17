import { useState } from "react";
import { useDispatch } from "react-redux";
import "../assets/CSS/DeleteBookingModal.css";
import { deleteBooking } from "../redux/booking/bookingThunk";
import { showError, showSuccess } from "../utilits/toast";

export default function DeleteBookingModal({ bookingId,
  userName,
  mobileNumber,
  onClose,
  onSuccess, bookingNumber}) {
  const dispatch = useDispatch();

  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const trimmedRemark = remark.trim();

    if (!trimmedRemark) {
      showError("Delete remark is required.");
      return;
    }


    setIsSubmitting(true);

    const result = await dispatch(
      deleteBooking({
        id: bookingId,
        remark: trimmedRemark,
      })
    );

    setIsSubmitting(false);

    if (deleteBooking.fulfilled.match(result)) {
      showSuccess(result.payload.message);
      onClose();
      onSuccess?.();
    } else {
      showError(result.payload?.message || "Failed to delete booking.");
    }
  };

  const handleRemarkChange = (e) => {
    setRemark(e.target.value);
  };

  return (
    <div className="bookingDeleteOverlay" onClick={onClose}>
      <div className="bookingDeleteContainer" onClick={(e) => e.stopPropagation()}>
        <h2 className="bookingDeleteTitle">Delete Booking</h2>

        <p className="bookingDeleteMessage">
          Are you sure want to delete Booking{" "}
          <span className="bookingDeleteHighlight">#{bookingNumber}</span> for user{" "}
          <span className="bookingDeleteHighlight">{userName}</span> (
          <span className="bookingDeleteHighlight">{mobileNumber}</span>) ?
        </p>

        <div className="bookingDeleteFieldGroup">
          <label className="bookingDeleteLabel">
            Delete Remark <span className="bookingDeleteRequired">*</span>
          </label>
          <textarea
            className="bookingDeleteTextarea"
            placeholder="Enter Remark"
            rows={2}
            value={remark}
            onChange={handleRemarkChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="bookingDeleteFooter">
          <button
            type="button"
            className="bookingDeleteCloseBtn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
          <button
            type="button"
            className="bookingDeleteDeleteBtn"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}