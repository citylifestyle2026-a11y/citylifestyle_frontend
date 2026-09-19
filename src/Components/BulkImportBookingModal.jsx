import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes, FaFileCsv } from "react-icons/fa";
import "../assets/CSS/BulkImportBookingModal.css";
import { importBookingsCsv } from "../redux/booking/bookingThunk";
import { clearImportResult } from "../redux/booking/bookingSlice";
import { showError, showSuccess } from "../utilits/toast";

// ================= BULK IMPORT BOOKING MODAL =================
// Lets an admin pick a .csv file and import bookings from it, one row
// per booking — mirrors CreateBookingModal's look (same bookingCreate*
// classes reused for the overlay/header/footer) while adding its own
// file-picker + per-row results list.
//
// Hits POST /bookings/import-csv (see services/bookingService.js ->
// importBookingsCsvApi), which internally creates each row via the same
// createBooking used by "Create Booking" — so every row that succeeds
// also gets its registration link sent automatically, exactly like a
// normal single booking.
//
// Expected CSV header row (case-insensitive, any column order):
//   eventId OR eventName, ticketTypeId OR ticketTypeName,
//   quantity, amount, name, mobileNumber, email, discount, remark

export default function BulkImportBookingModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const { importLoading, importResult, importError } = useSelector(
    (state) => state.booking
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    setFileError("");
    dispatch(clearImportResult());

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please select a .csv file.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setFileError("Please choose a CSV file first.");
      return;
    }

    try {
      const response = await dispatch(
        importBookingsCsv(selectedFile)
      ).unwrap();

      showSuccess(response.message || "CSV processed successfully.");

      // Refresh the bookings table behind the modal so newly created
      // bookings show up immediately, same as CreateBookingModal does.
      onSuccess();
    } catch (err) {
      showError(
        typeof err === "string" ? err : err?.message || "Failed to import bookings."
      );
    }
  };

  const handleClose = () => {
    dispatch(clearImportResult());
    onClose();
  };

  const handlePickAnotherFile = () => {
    setSelectedFile(null);
    setFileError("");
    dispatch(clearImportResult());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bookingCreateOverlay" onClick={handleClose}>
      <div
        className="bookingCreateContainer bulkImportContainer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bookingCreateHeader">
          <h2 className="bookingCreateTitle">Import Bookings (CSV)</h2>
          <button
            type="button"
            className="bookingCreateCloseIconButton"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <p className="bulkImportHint">
          Upload a CSV file to create bookings line by line. Each successful
          row also gets its registration link sent automatically, just like
          a normal booking. If a row matches an existing booking (same
          event, ticket type, mobile number, quantity &amp; amount) — including
          re-uploading the same file — it is skipped automatically so
          tickets are never duplicated.
        </p>
        <p className="bulkImportColumnsHint">
          Columns: <code>eventId</code> or <code>eventName</code>,{" "}
          <code>ticketTypeId</code> or <code>ticketTypeName</code>,{" "}
          <code>quantity, amount, name, mobileNumber, email, discount, remark</code>.
          Event/Ticket names must match exactly (not case-sensitive).{" "}
          <code>amount</code>, <code>email</code>, <code>discount</code> and{" "}
          <code>remark</code> can be left blank — a blank amount is filled in
          automatically from the ticket price (× quantity, minus discount).
        </p>

        <div className="bulkImportDropZone" onClick={handleBrowseClick}>
          <FaFileCsv className="bulkImportDropIcon" />
          {selectedFile ? (
            <span className="bulkImportFileName">{selectedFile.name}</span>
          ) : (
            <span className="bulkImportDropText">
              Click to choose a .csv file
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="bulkImportFileInput"
            onChange={handleFileChange}
          />
        </div>

        {fileError && <p className="bookingCreateFieldError">{fileError}</p>}
        {importError && (
          <p className="bookingCreateFieldError">{importError}</p>
        )}

        {importResult && (
          <div className="bulkImportResults">
            <div className="bulkImportSummary">
              <span className="bulkImportSummaryTotal">
                Total rows: {importResult.totalRows}
              </span>
              <span className="bulkImportSummarySuccess">
                Created: {importResult.successCount}
              </span>
              <span className="bulkImportSummaryDuplicate">
                Duplicates skipped: {importResult.duplicateCount || 0}
              </span>
              <span className="bulkImportSummaryFail">
                Failed: {importResult.failureCount - (importResult.duplicateCount || 0)}
              </span>
            </div>

            <div className="bulkImportResultList">
              {importResult.results.map((row) => (
                <div
                  key={row.row}
                  className={
                    row.success
                      ? "bulkImportResultRow bulkImportResultRow--success"
                      : row.duplicate
                      ? "bulkImportResultRow bulkImportResultRow--duplicate"
                      : "bulkImportResultRow bulkImportResultRow--fail"
                  }
                >
                  <span className="bulkImportResultRowNumber">
                    Row {row.row}
                    {row.duplicate && " (Duplicate)"}
                  </span>
                  {row.success ? (
                    <span>
                      Booking <strong>{row.bookingNumber}</strong> created (
                      {row.totalTickets} ticket
                      {row.totalTickets === 1 ? "" : "s"}) — registration
                      link sent.
                    </span>
                  ) : (
                    <span>
                      {row.name || "-"} ({row.mobileNumber || "-"}): {row.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bookingCreateFooter">
          <div className="bulkImportActions">
            <button
              type="button"
              className="bookingCreateCloseButton"
              onClick={handleClose}
              disabled={importLoading}
            >
              Close
            </button>
            {importResult && (
              <button
                type="button"
                className="bookingCreateCloseButton"
                onClick={handlePickAnotherFile}
                disabled={importLoading}
              >
                Import Another File
              </button>
            )}
            <button
              type="button"
              className="bookingCreateCreateButton"
              onClick={handleImport}
              disabled={importLoading || !selectedFile}
            >
              {importLoading ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}