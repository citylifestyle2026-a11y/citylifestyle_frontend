import { useRef, useState } from "react";
import { FaTimes, FaFileExcel, FaDownload, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

import { importMembersApi } from "../services/memberService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess, showWarning } from "../utilits/toast";
// Same look as the Guest List import dialog.
import "../assets/CSS/ImportContactsModal.css";
import "../assets/CSS/ImportMembersModal.css";

const SAMPLE_CSV = [
  "#,Name,Contact,Email,Profession,Company / Brand,Area,City,State,Reference,Reference 2,Reference 3,Source,Remark,Status,Company Designation,Address,Instagram Link,Relationship,Spouse Name,Spouse Mobile,Spouse Instagram Link,Spouse Profession",
  '1,Rahul Shah,9876543210,rahul@example.com,Real Estate & Developers,Shah Infra,Vesu,Surat,Gujarat,Karan Patel,Rasik Savani,,,,Active,Owner,"12 Green Park, Vesu",https://instagram.com/rahul.shah,Couple,Priya Shah,9876501234,https://instagram.com/priya.shah,Interior Designers',
  "2,Amit Desai,9123456780,,Textile,Desai Fabrics,Adajan,Surat,Gujarat,Karan Patel,,,,,Active,Manager,,,Single,,,,",
].join("\n");

const saveCsv = (text, fileName) => {
  // BOM so Excel opens Gujarati / Hindi text correctly.
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const downloadSample = () => saveCsv(SAMPLE_CSV, "members_sample.csv");

// Report columns: the first three explain the problem, the rest use the same
// headings as the import file, so the report can be corrected and imported again.
const REPORT_COLUMNS = [
  ["Type", (r) => (r.duplicate ? "Duplicate" : "Invalid")],
  ["Row", (r) => r.row],
  ["Reason", (r) => r.error],
  ["Name", (r) => r.data?.name ?? r.name],
  ["Contact", (r) => r.data?.mobile ?? r.mobileNumber],
  ["Email", (r) => r.data?.email],
  ["Profession", (r) => r.data?.profession],
  ["Company / Brand", (r) => r.data?.companyName],
  ["Area", (r) => r.data?.area],
  ["City", (r) => r.data?.city],
  ["State", (r) => r.data?.state],
  ["Reference", (r) => r.data?.reference1],
  ["Reference 2", (r) => r.data?.reference2],
  ["Reference 3", (r) => r.data?.reference3],
  ["Source", (r) => r.data?.source],
  ["Remark", (r) => r.data?.remark],
  ["Status", (r) => r.data?.memberStatus],
  ["Company Designation", (r) => r.data?.designation],
  ["Address", (r) => r.data?.address],
  ["Instagram Link", (r) => r.data?.instagramId],
  ["Relationship", (r) => r.data?.relationship],
  ["Spouse Name", (r) => r.data?.spouseName],
  ["Spouse Mobile", (r) => r.data?.spouseMobile],
  ["Spouse Instagram Link", (r) => r.data?.spouseInstagramId],
  ["Spouse Profession", (r) => r.data?.spouseProfession],
];

const csvCell = (value) => {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// kind = "invalid" | "duplicate" - each report has only its own rows, in its
// own file, so invalid and duplicate rows are never mixed together.
const downloadReport = (rows, kind) => {
  const lines = [REPORT_COLUMNS.map(([title]) => csvCell(title)).join(",")];
  rows.forEach((row) => {
    lines.push(REPORT_COLUMNS.map(([, get]) => csvCell(get(row))).join(","));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  saveCsv(lines.join("\r\n"), `members_${kind}_report_${stamp}.csv`);
};

// Invalid and duplicate rows, each in its own tab.
function ProblemTabs({ problems, tall = false }) {
  const invalidRows = problems.filter((r) => !r.duplicate);
  const duplicateRows = problems.filter((r) => r.duplicate);
  const [tab, setTab] = useState(invalidRows.length > 0 ? "invalid" : "duplicate");

  const rows = tab === "invalid" ? invalidRows : duplicateRows;

  return (
    <>
      <div className="importMembers__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invalid"}
          className={`importMembers__tab importMembers__tab--fail ${tab === "invalid" ? "importMembers__tab--active" : ""}`}
          onClick={() => setTab("invalid")}
        >
          Invalid ({invalidRows.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "duplicate"}
          className={`importMembers__tab importMembers__tab--dup ${tab === "duplicate" ? "importMembers__tab--active" : ""}`}
          onClick={() => setTab("duplicate")}
        >
          Duplicate ({duplicateRows.length})
        </button>

        <button
          type="button"
          className="importMembers__report"
          onClick={() => downloadReport(rows, tab)}
          disabled={rows.length === 0}
        >
          <FaDownload /> Download {tab === "invalid" ? "invalid" : "duplicate"} report ({rows.length})
        </button>
      </div>

      {rows.length > 0 ? (
        <ul className={`importContacts__problems ${tall ? "importContacts__problems--tall" : ""}`}>
          {rows.map((row) => (
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
        <p className="importMembers__empty">No {tab} rows.</p>
      )}
    </>
  );
}

/**
 * Choose a .xlsx / .csv -> it is checked right away (nothing is saved).
 * Then either:
 *   - "Import N"      saves only the good rows (duplicates / invalid skipped), or
 *   - "Import all N"  saves every row; duplicate / invalid ones are kept too,
 *                     marked "Needs Fix", so they can be edited later.
 * The invalid / duplicate rows are listed separately and can be downloaded
 * as a report.
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

  const handleImport = async (mode) => {
    if (!file || importing) return;

    setImporting(true);
    try {
      const res = await importMembersApi(file, { mode });
      const data = res?.data || {};
      setResult(data);

      const added = (data.successCount || 0) + (data.flaggedCount || 0);
      if (added === 0) showError(res?.message || "No members were added.");
      else if (data.flaggedCount > 0 || data.duplicateCount > 0 || data.failureCount > 0) showWarning(res?.message);
      else showSuccess(res?.message);

      if (added > 0) onSuccess?.();
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
  const hasProblems = check ? check.duplicateCount + check.failureCount > 0 : false;

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
                One contact per row. A mobile number that is already in Contact Book
                is not a duplicate: that contact is updated with the details in the file
                (empty cells keep the old value). New references are added to the
                existing ones. A reference like "Ramesh &amp; Suresh", "Ramesh / Suresh"
                or "Ramesh - Suresh" is saved as two separate references.
              </p>
              <button type="button" className="importContacts__sampleBtn" onClick={downloadSample}>
                <FaDownload /> Sample CSV
              </button>
            </div>

            <p className="importContacts__columns">
              <b>Required columns:</b> <code>Name</code>, <code>Contact</code> (10-digit mobile).{" "}
              <b>Optional:</b> <code>Email</code>, <code>Profession</code>,{" "}
              <code>Company / Brand</code>, <code>Area</code>,{" "}
              <code>City</code>, <code>State</code>, <code>Reference</code>,{" "}
              <code>Reference 2</code>, <code>Reference 3</code>, <code>Source</code>,{" "}
              <code>Remark</code>, <code>Status</code>,{" "}
              <code>Company Designation</code>, <code>Address</code>,{" "}
              <code>Instagram Link</code>, <code>Relationship</code> (Single / Couple),{" "}
              <code>Spouse Name</code>, <code>Spouse Mobile</code>,{" "}
              <code>Spouse Instagram Link</code>, <code>Spouse Profession</code>.
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
                  <span className="importContacts__chip importContacts__chip--ok">{check.successCount} ready{check.updatedCount > 0 ? ` (${check.updatedCount} update)` : ""}</span>
                  <span className="importContacts__chip importContacts__chip--dup">{check.duplicateCount} duplicate</span>
                  <span className="importContacts__chip importContacts__chip--fail">{check.failureCount} invalid</span>
                </div>

                {hasProblems ? (
                  <ProblemTabs problems={problems} />
                ) : (
                  <p className="importContacts__ok"><FaCheckCircle /> File looks good - every row can be imported.</p>
                )}

                {hasProblems && (
                  <p className="importMembers__note">
                    <b>Import {check.successCount}</b> adds only the ready rows.{" "}
                    <b>Import all {check.totalRows}</b> adds every row; the invalid and duplicate
                    ones are marked <b>Needs Fix</b> so you can edit them later.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="importContacts__result">
            <div className="importContacts__chips">
              <span className="importContacts__chip importContacts__chip--total">Total rows: {result.totalRows}</span>
              <span className="importContacts__chip importContacts__chip--ok">
                Added: {(result.successCount || 0) - (result.updatedCount || 0) + (result.flaggedCount || 0)}
              </span>
              <span className="importContacts__chip importContacts__chip--ok">
                Updated: {result.updatedCount || 0}
              </span>
              {result.mode === "all" ? (
                <span className="importContacts__chip importContacts__chip--fail">Needs Fix: {result.flaggedCount}</span>
              ) : (
                <>
                  <span className="importContacts__chip importContacts__chip--dup">Duplicates skipped: {result.duplicateCount}</span>
                  <span className="importContacts__chip importContacts__chip--fail">Invalid skipped: {result.failureCount}</span>
                </>
              )}
            </div>

            {result.mode === "all" && result.flaggedCount > 0 && (
              <p className="importMembers__note">
                These rows were added and are under the <b>Needs Fix</b> tab. Edit each one to
                correct the name / mobile number.
              </p>
            )}

            {problems.length > 0 && <ProblemTabs problems={problems} tall />}
          </div>
        )}

        <div className="importContacts__footer importMembers__footer">
          <button type="button" className="importContacts__btn importContacts__btn--ghost" onClick={onClose} disabled={importing}>
            Close
          </button>
          {result ? (
            <button type="button" className="importContacts__btn importContacts__btn--primary" onClick={handleAnother}>
              Import Another File
            </button>
          ) : (
            <>
              <button
                type="button"
                className="importContacts__btn importContacts__btn--primary"
                onClick={() => handleImport("valid")}
                disabled={!file || importing || checking || Boolean(fileError) || !check || check.successCount === 0}
              >
                {importing
                  ? "Importing..."
                  : check?.successCount
                  ? `Import ${check.successCount}`
                  : "Import"}
              </button>

              {hasProblems && (
                <button
                  type="button"
                  className="importContacts__btn importContacts__btn--primary importMembers__btnAll"
                  onClick={() => handleImport("all")}
                  disabled={!file || importing || checking || Boolean(fileError) || !check}
                >
                  {importing ? "Importing..." : `Import all ${check.totalRows}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}