import { useRef, useState } from "react";
import { FaTimes, FaFileExcel, FaDownload } from "react-icons/fa";

import { importCrewApi, downloadCrewSampleApi } from "../services/crewService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/CreateCrewCategoryModal.css";

// Step 1: choose a file -> "Check file" (dry run, nothing saved).
// Step 2: "Import" saves the valid rows. Unknown categories are created.
export default function ImportCrewModal({ onClose, onSuccess }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const chooseFile = (e) => {
    setFile(e.target.files?.[0] || null);
    setPreview(null);
  };

  const run = async (dryRun) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const res = await importCrewApi(file, { dryRun });
      if (dryRun) {
        setPreview(res.data);
      } else {
        showSuccess(res.message || "Crew imported");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      showError(getErrorText(err, "Failed to read the file"));
    } finally {
      setBusy(false);
    }
  };

  const sample = async () => {
    try {
      await downloadCrewSampleApi();
    } catch (err) {
      showError(getErrorText(err, "Failed to download sample"));
    }
  };

  return (
    <div className="crewCategoryModalOverlay" onClick={busy ? undefined : onClose}>
      <div
        className="createCrewCategoryModal"
        style={{ maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <h2 className="modalTitle">Import Crew (Excel / CSV)</h2>
          <button type="button" className="closeIconButton" onClick={onClose} disabled={busy} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <p style={{ fontSize: 13.5, color: "#5b6785", margin: "0 0 14px" }}>
          Columns: <b>Full Name</b>, <b>WhatsApp Number</b> (required), Email, Crew Category (company),
          Designation, Area, Address, Remark. A category that does not exist yet is created automatically.
        </p>

        <button type="button" className="modalCloseButton" onClick={sample} style={{ marginBottom: 14 }}>
          <FaDownload /> Download sample file
        </button>

        <div
          className="fieldGroup fieldGroupFull"
          style={{ border: "1px dashed #c9cde0", borderRadius: 12, padding: 18, textAlign: "center" }}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.csv" hidden onChange={chooseFile} />
          <button
            type="button"
            className="modalCloseButton"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <FaFileExcel /> {file ? file.name : "Choose .xlsx or .csv file"}
          </button>
        </div>

        {preview && (
          <div style={{ marginTop: 16, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              <b>{preview.valid}</b> of {preview.totalRows} rows are ready to import
              {preview.failed > 0 && <>, <b style={{ color: "#e0331e" }}>{preview.failed}</b> will be skipped</>}.
            </p>
            {preview.newCategories?.length > 0 && (
              <p style={{ margin: "6px 0 0" }}>New crew categories: {preview.newCategories.join(", ")}</p>
            )}
            {preview.problems?.length > 0 && (
              <ul style={{ maxHeight: 150, overflowY: "auto", margin: "8px 0 0", paddingLeft: 18, color: "#b33a2b" }}>
                {preview.problems.map((p, i) => (
                  <li key={i}>
                    Row {p.row} ({p.name}): {p.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="modalFooter">
          <button type="button" className="modalCloseButton" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {!preview ? (
            <button type="button" className="modalCreateButton" onClick={() => run(true)} disabled={!file || busy}>
              {busy ? "Checking..." : "Check file"}
            </button>
          ) : (
            <button
              type="button"
              className="modalCreateButton"
              onClick={() => run(false)}
              disabled={busy || preview.valid === 0}
            >
              {busy ? "Importing..." : `Import ${preview.valid}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
