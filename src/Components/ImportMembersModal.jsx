import { useRef, useState } from "react";
import { FaTimes, FaFileExcel, FaDownload, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

import { importMembersApi } from "../services/memberService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess, showWarning } from "../utilits/toast";
// Same look as the Guest List import dialog.
import "../assets/CSS/ImportContactsModal.css";

const SAMPLE_CSV = [
  "#,Name,Contact,Email,Profession,Company / Brand,Objective,Area,City,State,Reference,Reference 2,Reference 3,Source,Remark,Status",
  '1,Rahul Shah,9876543210,rahul@example.com,Real Estate & Developers,Shah Infra,,Vesu,Surat,Gujarat,Karan Patel,Rasik Savani,,,,Active',
].join("\n");

const downloadSample = () => {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "members_sample.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Choose a .xlsx / .csv -> it is checked right away (nothing is saved) ->
 * Import adds the new members. Numbers already in Member List are skipped.
 */
export default function ImportMembersModal({ onClose, onSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const runCheck = async (selected) => {
    setChecking(true);
    setCheck(null);
    try {
      const res = await importMembersApi(selected, { dryRun: true });
      setCheck(res?.data || null);
    } catch (err) {
      setFileError(getErrorText(err, "Could not check the file."));
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

    const name = picked.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
      setFileError("Please select an .xlsx or .csv file.");
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(picked);
    runCheck(picked);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!file || importing) return;

    setImporting(true);
    try {
      const res = await importMembersApi(file);
      const data = res?.data || {};
      setResult(data);

      if (data.successCount === 0) showError(res?.message || "No members were added.");
      else if (data.duplicateCount > 0 || data.failureCount > 0) showWarning(res?.message);
      else showSuccess(res?.message);

      if (data.successCount > 0) onSuccess?.();
    } catch (err) {
      showError(getErrorText(err, "Failed to import members."));
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

  const problems = (result || check)?.problems || [];

  return (
    <div className="importContacts__overlay" onMouseDown={importing ? undefined : onClose}>
      <div className="importContacts__container" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="importContacts__header">
          <h2 className="importContacts__title">Import Members (Excel / CSV)</h2>
          <button type="button" className="importContacts__close" onClick={onClose} disabled={importing} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {!result && (
          <>
            <div className="importContacts__sampleRow">
              <p className="importContacts__hint">
                One member per row. A mobile number that is already in Member List
                (or repeated in the file) is skipped, never overwritten.
              </p>
              <button type="button" className="importContacts__sampleBtn" onClick={downloadSample}>
                <FaDownload /> Sample CSV
              </button>
            </div>

            <p className="importContacts__columns">
              <b>Required columns:</b> <code>Name</code>, <code>Contact</code> (10-digit mobile).{" "}
              <b>Optional:</b> <code>Email</code>, <code>Profession</code>,{" "}
              <code>Company / Brand</code>, <code>Objective</code>, <code>Area</code>,{" "}
              <code>City</code>, <code>State</code>, <code>Reference</code>,{" "}
              <code>Reference 2</code>, <code>Reference 3</code>, <code>Source</code>,{" "}
              <code>Remark</code>, <code>Status</code>.
            </p>

            <div className="importContacts__drop" onClick={() => fileInputRef.current?.click()}>
              <FaFileExcel className="importContacts__dropIcon" />
              {file ? (
                <span className="importContacts__fileName">{file.name}</span>
              ) : (
                <span className="importContacts__dropText">Click to choose an .xlsx or .csv file</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="importContacts__fileInput"
                onChange={handleFileChange}
              />
            </div>

            {fileError && <p className="importContacts__error">{fileError}</p>}
            {checking && <p className="importContacts__checking">Checking file...</p>}

            {check && (
              <div className="importContacts__check">
                <div className="importContacts__chips">
                  <span className="importContacts__chip importContacts__chip--total">{check.totalRows} rows</span>
                  <span className="importContacts__chip importContacts__chip--ok">{check.successCount} ready</span>
                  <span className="importContacts__chip importContacts__chip--dup">{check.duplicateCount} duplicate</span>
                  <span className="importContacts__chip importContacts__chip--fail">{check.failureCount} invalid</span>
                </div>

                {problems.length > 0 ? (
                  <ul className="importContacts__problems">
                    {problems.map((row) => (
                      <li key={row.row}>
                        <FaExclamationTriangle className={row.duplicate ? "importContacts__warnIcon" : "importContacts__failIcon"} />
                        <span>
                          <b>Row {row.row}</b>
                          {row.name ? ` - ${row.name}` : ""}
                          {row.mobileNumber ? ` (${row.mobileNumber})` : ""}: {row.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="importContacts__ok"><FaCheckCircle /> File looks good - every row can be imported.</p>
                )}
                {check.problemsTruncated && (
                  <p className="importContacts__hint">Showing the first {problems.length} problem rows.</p>
                )}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="importContacts__result">
            <div className="importContacts__chips">
              <span className="importContacts__chip importContacts__chip--total">Total rows: {result.totalRows}</span>
              <span className="importContacts__chip importContacts__chip--ok">Added: {result.successCount}</span>
              <span className="importContacts__chip importContacts__chip--dup">Duplicates skipped: {result.duplicateCount}</span>
              <span className="importContacts__chip importContacts__chip--fail">Invalid: {result.failureCount}</span>
            </div>

            {problems.length > 0 && (
              <ul className="importContacts__problems importContacts__problems--tall">
                {problems.map((row) => (
                  <li key={row.row}>
                    <FaExclamationTriangle className={row.duplicate ? "importContacts__warnIcon" : "importContacts__failIcon"} />
                    <span>
                      <b>Row {row.row}</b>
                      {row.name ? ` - ${row.name}` : ""}
                      {row.mobileNumber ? ` (${row.mobileNumber})` : ""}: {row.error}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="importContacts__footer">
          <button type="button" className="importContacts__btn importContacts__btn--ghost" onClick={onClose} disabled={importing}>
            Close
          </button>
          {result ? (
            <button type="button" className="importContacts__btn importContacts__btn--primary" onClick={handleAnother}>
              Import Another File
            </button>
          ) : (
            <button
              type="button"
              className="importContacts__btn importContacts__btn--primary"
              onClick={handleImport}
              disabled={!file || importing || checking || Boolean(fileError) || !check || check.successCount === 0}
            >
              {importing
                ? "Importing..."
                : check?.successCount
                ? `Import ${check.successCount} member${check.successCount === 1 ? "" : "s"}`
                : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
