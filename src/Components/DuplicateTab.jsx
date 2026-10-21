import { useCallback, useEffect, useState } from "react";
import { FaSearch, FaCodeBranch, FaTrashAlt } from "react-icons/fa";

import DuplicateFixModal from "./DuplicateFixModal";
import { getDuplicatesApi, ignoreDuplicateApi } from "../services/contactService";
import { confirmDialog } from "../utilits/appSwal";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { formatDateTime } from "../utilits/dateFormat";
import "../assets/CSS/DuplicateTab.css";

const PAGE_SIZE = 10;

const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

/**
 * Body of the Guest List "Duplicate" tab: form submissions whose WhatsApp
 * number is already in the Guest List. "Fix" opens the sync popup, "Ignore"
 * removes the submission. `onChanged` lets the page refresh its tab counts.
 */
export default function DuplicateTab({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fixRow, setFixRow] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await getDuplicatesApi({ page, limit: PAGE_SIZE, search: debounced });
        if (cancelled) return;
        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setError("");
      } catch (err) {
        if (!cancelled) setError(getErrorText(err, "Failed to load duplicates."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debounced, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
    onChanged?.();
  }, [onChanged]);

  const handleIgnore = async (row) => {
    const ok = await confirmDialog({
      title: "Ignore this duplicate?",
      text: `The form submission of ${row.fullName || row.whatsappNumber} will be removed. The Guest List is not changed.`,
      confirmText: "Yes, ignore",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await ignoreDuplicateApi(row._id);
      showSuccess(res.message || "Duplicate removed");
      // Last row of a page -> go back one page.
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      refresh();
    } catch (err) {
      showError(getErrorText(err, "Could not remove the duplicate."));
    }
  };

  return (
    <div className="dupTab">
      {fixRow && (
        <DuplicateFixModal duplicate={fixRow} onClose={() => setFixRow(null)} onDone={refresh} />
      )}

      <p className="dupTab__hint">
        These people filled the form with a WhatsApp number that is already in the Guest List. No new
        guest or pass was created. Press <b>Fix</b> to choose the right details and sync them into the
        existing guest (and the Contact Book).
      </p>

      <div className="dupTab__controls">
        <div className="dupTab__search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search name, number, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="dupTab__tableWrap">
        <table className="dupTab__table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>WhatsApp Number</th>
              <th>Company Name</th>
              <th>Designation</th>
              <th>Company Category</th>
              <th>Area</th>
              <th>Existing Guest</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={9} className="dupTab__state">Loading duplicates...</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={9} className="dupTab__state dupTab__state--error">{error}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={9} className="dupTab__state">No duplicates. Everything is in sync.</td></tr>
            )}

            {rows.map((row) => (
              <tr key={row._id}>
                <td className="dupTab__name">{row.fullName || "-"}</td>
                <td>{row.whatsappNumber || "-"}</td>
                <td>{row.companyName || "-"}</td>
                <td>{row.designation || "-"}</td>
                <td>{row.companyCategory?.name || "-"}</td>
                <td>{row.area || "-"}</td>
                <td>
                  {row.contactId ? (
                    <>
                      {row.contactId.fullName}
                      <span className={`dupTab__badge dupTab__badge--${row.contactId.approvalStatus || "approved"}`}>
                        {STATUS_LABEL[row.contactId.approvalStatus || "approved"]}
                      </span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{formatDateTime(row.createdAt)}</td>
                <td>
                  <div className="dupTab__actions">
                    <button type="button" className="dupTab__btn dupTab__btn--fix" onClick={() => setFixRow(row)}>
                      <FaCodeBranch /> Fix
                    </button>
                    <button type="button" className="dupTab__btn dupTab__btn--ignore" onClick={() => handleIgnore(row)}>
                      <FaTrashAlt /> Ignore
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dupTab__footer">
        <span>
          {total === 0
            ? "Show 0 of 0"
            : `Show ${(page - 1) * PAGE_SIZE + 1} - ${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        {totalPages > 1 && (
          <div className="dupTab__pager">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>{page} / {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
