import { useCallback, useEffect, useRef, useState } from "react";
import { FaSearch, FaCodeBranch, FaTrashAlt, FaChevronDown } from "react-icons/fa";

import DuplicateFixModal from "./DuplicateFixModal";
import CommonEmptyState from "./CommonEmptyState";
import {
  getDuplicatesApi,
  ignoreDuplicateApi,
  bulkFixDuplicatesApi,
  bulkIgnoreDuplicatesApi,
} from "../services/contactService";
import { confirmDialog } from "../utilits/appSwal";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { formatDateTime } from "../utilits/dateFormat";
import useClickOutside from "../hooks/useClickOutside";
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
  const [selected, setSelected] = useState([]); // ids on screen
  const [selectAllMatching, setSelectAllMatching] = useState(false); // every row of the search
  const [busy, setBusy] = useState(false);

  // Row "Action" dropdown. The menu is position: fixed (placed from the
  // button's screen position) so the scrolling table never clips it.
  const [menu, setMenu] = useState(null); // { id, top, right, up }
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setMenu(null));

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const toggleMenu = (event, id) => {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const MENU_HEIGHT = 112;
    const up = window.innerHeight - rect.bottom < MENU_HEIGHT + 12;
    setMenu({
      id,
      right: Math.max(8, window.innerWidth - rect.right),
      top: up ? rect.top - MENU_HEIGHT - 6 : rect.bottom + 6,
      up,
    });
  };

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

  const pageIds = rows.map((r) => r._id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const selectedCount = selectAllMatching ? total : selected.length;

  const clearSelection = () => {
    setSelected([]);
    setSelectAllMatching(false);
  };

  // Selection never survives a page / search change (it would be confusing).
  useEffect(() => {
    setSelected([]);
    setSelectAllMatching(false);
  }, [page, debounced]);

  const toggleOne = (id) => {
    setSelectAllMatching(false);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePage = () => {
    setSelectAllMatching(false);
    setSelected(allOnPageSelected ? [] : pageIds);
  };

  const bulkBody = () => (selectAllMatching ? { all: true, search: debounced } : { ids: selected });

  const handleBulkFix = async () => {
    if (busy || selectedCount === 0) return;
    const ok = await confirmDialog({
      title: `Fix ${selectedCount} duplicate${selectedCount === 1 ? "" : "s"}?`,
      text: "Details are NOT asked one by one. Where the details differ the Guest List value is kept (a longer name wins), empty fields are filled from the form, references are joined, and the Contact Book is synced.",
      confirmText: "Yes, fix & sync",
      tone: "info",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await bulkFixDuplicatesApi(bulkBody());
      showSuccess(res.message || "Fixed");
      clearSelection();
      setPage(1);
      refresh();
    } catch (err) {
      showError(getErrorText(err, "Bulk fix failed."));
    } finally {
      setBusy(false);
    }
  };

  const handleBulkIgnore = async () => {
    if (busy || selectedCount === 0) return;
    const ok = await confirmDialog({
      title: `Ignore ${selectedCount} duplicate${selectedCount === 1 ? "" : "s"}?`,
      text: "These form submissions will be removed. The Guest List is not changed.",
      confirmText: "Yes, ignore",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await bulkIgnoreDuplicatesApi(bulkBody());
      showSuccess(res.message || "Removed");
      clearSelection();
      setPage(1);
      refresh();
    } catch (err) {
      showError(getErrorText(err, "Bulk ignore failed."));
    } finally {
      setBusy(false);
    }
  };

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

      {selectedCount > 0 && (
        <div className="dupTab__bulkBar">
          <span>
            <b>{selectedCount}</b> selected
            {!selectAllMatching && allOnPageSelected && total > rows.length && (
              <button type="button" className="dupTab__linkBtn" onClick={() => setSelectAllMatching(true)}>
                Select all {total} duplicates
              </button>
            )}
          </span>
          <div className="dupTab__actions">
            <button type="button" className="dupTab__btn dupTab__btn--fix" disabled={busy} onClick={handleBulkFix}>
              <FaCodeBranch /> {busy ? "Working..." : "Fix & Sync selected"}
            </button>
            <button type="button" className="dupTab__btn dupTab__btn--ignore" disabled={busy} onClick={handleBulkIgnore}>
              <FaTrashAlt /> Ignore selected
            </button>
            <button type="button" className="dupTab__btn" disabled={busy} onClick={clearSelection}>Clear</button>
          </div>
        </div>
      )}

      <div className="dupTab__tableWrap">
        <table className="dupTab__table">
          <thead>
            <tr>
              <th className="dupTab__check">
                <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on this page" />
              </th>
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
              <tr><td colSpan={10} className="dupTab__state">Loading duplicates...</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={10} className="dupTab__state dupTab__state--error">{error}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="dupTab__state">
                  <CommonEmptyState message="No duplicates. Everything is in sync." />
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row._id}>
                <td className="dupTab__check">
                  <input
                    type="checkbox"
                    checked={selectAllMatching || selected.includes(row._id)}
                    onChange={() => toggleOne(row._id)}
                    aria-label={`Select ${row.fullName || row.whatsappNumber}`}
                  />
                </td>
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
                <td>
                  {formatDateTime(row.updatedAt || row.createdAt)}
                  {row.submissionCount > 1 && <span className="dupTab__times"> x{row.submissionCount}</span>}
                </td>
                <td className="dupTab__actionCol">
                  <div className="dupAction__wrapper" ref={menu?.id === row._id ? menuRef : null}>
                    <button
                      type="button"
                      className={`dupAction__button ${menu?.id === row._id ? "dupAction__button--open" : ""}`}
                      aria-haspopup="menu"
                      aria-expanded={menu?.id === row._id}
                      onClick={(e) => toggleMenu(e, row._id)}
                    >
                      Action
                      <FaChevronDown className="dupAction__icon" />
                    </button>

                    {menu?.id === row._id && (
                      <div
                        className="dupAction__menu"
                        role="menu"
                        style={{ top: menu.top, right: menu.right }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="dupAction__item dupAction__item--fix"
                          onClick={() => {
                            setMenu(null);
                            setFixRow(row);
                          }}
                        >
                          <FaCodeBranch /> Fix &amp; Sync
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="dupAction__item dupAction__item--ignore"
                          onClick={() => {
                            setMenu(null);
                            handleIgnore(row);
                          }}
                        >
                          <FaTrashAlt /> Ignore
                        </button>
                      </div>
                    )}
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