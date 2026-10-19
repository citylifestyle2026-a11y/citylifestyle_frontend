import { useRef, useState } from "react";
import {
  FaTimes,
  FaFileCsv,
  FaDownload,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

import { importContactsCsvApi } from "../services/contactService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess, showWarning } from "../utilits/toast";
import "../assets/CSS/ImportContactsModal.css";

// Header + two example rows (one Single, one Couple) for "Download sample".
const SAMPLE_CSV = [
  "fullName,whatsappNumber,companyName,designation,companyCategory,area,address,instagramId,email,relationship,spouseName,spouseMobile,spouseInstagramId,spouseCategory,references",
  'Rahul Shah,9876543210,Shah Textiles,Owner,Textile,Vesu,"12, Main Road",https://instagram.com/rahul.shah,rahul@example.com,Single,,,,,Karan|Mahesh',
  'Amit Patel,9123456780,Patel Jewels,Director,Jewellery,Adajan,,,,Couple,Pooja Patel,9988776655,https://instagram.com/pooja.patel,Fashion,Karan',
].join("\n");

const downloadSampleCsv = () => {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "contacts_sample.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved", hint: "Visible & ready to send pass" },
  { value: "pending", label: "Pending", hint: "Needs approval first" },
];

/**
 * ImportContactsModal
 * Choose a .csv -> the file is checked right away (nothing is saved) ->
 * pick whether the contacts come in as Approved or Pending -> Import.
 */
export default function ImportContactsModal({ onClose, onSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("approved");

  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState(null);

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const runCheck = async (selected) => {
    setChecking(true);
    setCheck(null);
    try {
      const res = await importContactsCsvApi(selected, { dryRun: true });
      setCheck(res?.data || null);
    } catch (err) {
      setFileError(getErrorText(err, "Could not check the CSV file."));
    } finally {
      setChecking(false);
    }
  };

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0];

    setFileError("");
    setCheck(null);
    setResult(null);

    if (!picked) {
      setFile(null);
      return;
    }

    if (!picked.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please select a .csv file.");
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(picked);
    runCheck(picked);
    // Allows choosing the same file again after fixing it.
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!file || importing) return;

    setImporting(true);
    try {
      const res = await importContactsCsvApi(file, { approvalStatus });
      const data = res?.data || {};
      setResult(data);

      if (data.successCount === 0) {
        showError(res?.message || "No contacts were imported.");
      } else if (data.duplicateCount > 0 || data.failureCount > 0) {
        showWarning(res?.message);
      } else {
        showSuccess(res?.message);
      }

      if (data.successCount > 0) onSuccess?.();
    } catch (err) {
      showError(getErrorText(err, "Failed to import contacts."));
    } finally {
      setImporting(false);
    }
  };

  const handleAnother = () => {
    setFile(null);
    setFileError("");
    setCheck(null);
    setResult(null);
  };

  const problemRows = (check?.results || []).filter((row) => !row.success);

  return (
    <div className="importContacts__overlay" onMouseDown={importing ? undefined : onClose}>
      <div
        className="importContacts__container"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="importContacts__header">
          <h2 className="importContacts__title">Import Contacts (CSV)</h2>
          <button
            type="button"
            className="importContacts__close"
            onClick={onClose}
            disabled={importing}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {!result && (
          <>
            <div className="importContacts__sampleRow">
              <p className="importContacts__hint">
                One contact per row. A WhatsApp number that is already saved
                is not skipped: that contact is updated with the row, and new
                references are added to the existing ones.
              </p>
              <button
                type="button"
                className="importContacts__sampleBtn"
                onClick={downloadSampleCsv}
              >
                <FaDownload /> Sample CSV
              </button>
            </div>

            <p className="importContacts__columns">
              <b>Required:</b> <code>fullName</code>, <code>whatsappNumber</code>,{" "}
              <code>companyName</code>, <code>designation</code>,{" "}
              <code>companyCategory</code> (name), <code>area</code>,{" "}
              <code>references</code> (separate several with <code>|</code>).{" "}
              <b>Optional:</b> <code>address</code>, <code>instagramId</code>,{" "}
              <code>email</code>, <code>relationship</code> (Single / Couple,
              blank = Single). <b>For Couple:</b> <code>spouseName</code>,{" "}
              <code>spouseMobile</code>, <code>spouseCategory</code>{" "}
              (+ optional <code>spouseInstagramId</code>).
            </p>

            <label className="importContacts__label">Import contacts as</label>
            <div className="importContacts__segment" role="radiogroup">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={approvalStatus === option.value}
                  className={`importContacts__segmentBtn ${
                    approvalStatus === option.value
                      ? "importContacts__segmentBtnActive"
                      : ""
                  }`}
                  onClick={() => setApprovalStatus(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>

            <div
              className="importContacts__drop"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaFileCsv className="importContacts__dropIcon" />
              {file ? (
                <span className="importContacts__fileName">{file.name}</span>
              ) : (
                <span className="importContacts__dropText">
                  Click to choose a .csv file
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="importContacts__fileInput"
                onChange={handleFileChange}
              />
            </div>

            {fileError && <p className="importContacts__error">{fileError}</p>}
            {checking && <p className="importContacts__checking">Checking file...</p>}

            {check && (
              <div className="importContacts__check">
                <div className="importContacts__chips">
                  <span className="importContacts__chip importContacts__chip--ok">
                    {check.successCount} ready
                    {check.updatedCount > 0 ? ` (${check.updatedCount} update)` : ""}
                  </span>
                  <span className="importContacts__chip importContacts__chip--dup">
                    {check.duplicateCount} duplicate
                  </span>
                  <span className="importContacts__chip importContacts__chip--fail">
                    {check.failureCount} with errors
                  </span>
                </div>

                {problemRows.length > 0 && (
                  <ul className="importContacts__problems">
                    {problemRows.map((row) => (
                      <li key={row.row}>
                        <FaExclamationTriangle
                          className={
                            row.duplicate
                              ? "importContacts__warnIcon"
                              : "importContacts__failIcon"
                          }
                        />
                        <span>
                          <b>Row {row.row}</b>
                          {row.name ? ` - ${row.name}` : ""}: {row.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {problemRows.length === 0 && (
                  <p className="importContacts__ok">
                    <FaCheckCircle /> File looks good - every row can be imported.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="importContacts__result">
            <div className="importContacts__chips">
              <span className="importContacts__chip importContacts__chip--total">
                Total rows: {result.totalRows}
              </span>
              <span className="importContacts__chip importContacts__chip--ok">
                Created: {result.successCount - (result.updatedCount || 0)}
              </span>
              <span className="importContacts__chip importContacts__chip--ok">
                Updated: {result.updatedCount || 0}
              </span>
              <span className="importContacts__chip importContacts__chip--dup">
                Duplicates skipped: {result.duplicateCount}
              </span>
              <span className="importContacts__chip importContacts__chip--fail">
                Failed: {result.failureCount}
              </span>
            </div>

            <ul className="importContacts__problems importContacts__problems--tall">
              {result.results.map((row) => (
                <li key={row.row}>
                  {row.success ? (
                    <FaCheckCircle className="importContacts__okIcon" />
                  ) : (
                    <FaExclamationTriangle
                      className={
                        row.duplicate
                          ? "importContacts__warnIcon"
                          : "importContacts__failIcon"
                      }
                    />
                  )}
                  <span>
                    <b>Row {row.row}</b>
                    {row.name ? ` - ${row.name}` : ""}
                    {row.success ? " imported" : `: ${row.error}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="importContacts__footer">
          <button
            type="button"
            className="importContacts__btn importContacts__btn--ghost"
            onClick={onClose}
            disabled={importing}
          >
            Close
          </button>
          {result ? (
            <button
              type="button"
              className="importContacts__btn importContacts__btn--primary"
              onClick={handleAnother}
            >
              Import Another File
            </button>
          ) : (
            <button
              type="button"
              className="importContacts__btn importContacts__btn--primary"
              onClick={handleImport}
              disabled={
                !file ||
                importing ||
                checking ||
                Boolean(fileError) ||
                !check ||
                check.successCount === 0
              }
            >
              {importing
                ? "Importing..."
                : check?.successCount
                ? `Import ${check.successCount} contact${check.successCount === 1 ? "" : "s"}`
                : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}