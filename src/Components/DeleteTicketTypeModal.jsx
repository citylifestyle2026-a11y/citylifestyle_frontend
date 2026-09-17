import React, { useEffect } from "react";
import "../assets/CSS/DeleteTicketTypeModal.css";
import { useDispatch, useSelector } from "react-redux";
import { deleteTicketType, getAllTicketTypes } from "../redux/ticketType/ticketTypeThunk";
import { clearTicketTypeState } from "../redux/ticketType/ticketTypeSlice";

const DeleteTicketTypeModal = ({
  isOpen = true,
  onClose = () => {},
  ticketTypeId = null,
  ticketName = "Fast 100 SESSON PASS 4 DAYS",
}) => {
  const dispatch = useDispatch();

  const { loading, success, error } = useSelector((state) => state.ticketType);

  // ================= HANDLE DELETE =================
  const handleDelete = () => {
    if (!ticketTypeId) return;
    dispatch(deleteTicketType(ticketTypeId));
  };

  // ================= SUCCESS HANDLING =================
  useEffect(() => {
    if (success) {
      dispatch(getAllTicketTypes());
      dispatch(clearTicketTypeState());
      onClose();
    }
  }, [success]);

  // ================= RESET STATE ON CLOSE =================
  const handleClose = () => {
    dispatch(clearTicketTypeState());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ticketTypeDelete-overlay">
      <div className="ticketTypeDelete-modal">
        <h2 className="ticketTypeDelete-title">Delete Ticket Type</h2>

        <p className="ticketTypeDelete-message">
          Are you sure you want to delete{" "}
          <span className="ticketTypeDelete-ticketName">{ticketName}</span>?
        </p>

        {error && <p className="ticketTypeDelete-error">{error}</p>}

        <div className="ticketTypeDelete-footer">
          <button
            type="button"
            className="ticketTypeDelete-closeBtn"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="ticketTypeDelete-deleteBtn"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTicketTypeModal;