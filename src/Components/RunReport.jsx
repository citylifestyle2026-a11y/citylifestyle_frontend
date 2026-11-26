import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaFileExcel, FaChevronDown, FaTrash, FaPaperPlane } from "react-icons/fa";

import CommonSearch from "./CommonSearch";
import CommonSelect from "./CommonSelect";
import CommonTable from "./CommonTable";
import CommonPagination from "./CommonPagination";
import {
  getRunRegistrationsApi,
  exportRunRegistrationsApi,
  deleteRunRegistrationsApi,
  resendRunRegistrationApi,
} from "../services/runRegistrationService";
import { confirmDialog } from "../utilits/appSwal";
import { saveBlob } from "../utilits/download";
import { formatDateTime } from "../utilits/dateFormat";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { ALL_ROWS, ALL_ROWS_OPTION } from "../utilits/rowsPerPage";
// Same table / search / tab styles as the other list pages.
import "../assets/CSS/CompanyCategory.css";
import "../assets/CSS/FormLinks.css";
import "../assets/CSS/RunRegistration.css";

// Let's Run report body (page: Pages/RunReportPage.jsx). Who registered, who was scanned at the gate and who registered
// but has not been scanned (yet).
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }));
ROWS_PER_PAGE_OPTIONS.push(ALL_ROWS_OPTION);

// Only these three views, in this order: everyone who registered, who was
// scanned at the gate, and who registered but was not scanned.
const TABS = [
  { value: "registered", label: "Registered" },
  { value: "scanned", label: "Scanned" },
  { value: "notScanned", label: "Registered, Not Scanned" },
];

const EMPTY_SUMMARY = { registered: 0, scanned: 0, notScanned: 0 };

const displayMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? `+91 ${digits.slice(2)}` : value || "-";
};

export default function RunReport({ eventId }) {
  const [status, setStatus] = useState("registered");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  // Checkbox selection (id -> true). Kept while paging; cleared when the tab,
  // the search or the event changes (the selection belongs to that list).
  const [selected, setSelected] = useState({});
  const [selectingAll, setSelectingAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const menuRef = useRef(null);

  // Row-wise "Action" dropdown: { item, top, left } of the open row menu.
  const [rowMenu, setRowMenu] = useState(null);
  const rowMenuRef = useRef(null);
  useEffect(() => {
    if (!rowMenu) return undefined;
    const close = (e) => {
      if (e.type === "mousedown" && rowMenuRef.current?.contains(e.target)) return;
      if (e.type === "mousedown" && e.target.closest?.("[data-row-action]")) return;
      setRowMenu(null);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rowMenu]);

  const openRowMenu = (e, item) => {
    if (rowMenu?.item._id === item._id) {
      setRowMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setRowMenu({ item, top: rect.bottom + 6, left: Math.max(8, rect.right - 180) });
  };

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Another event picked in the header dropdown -> start from page 1.
  useEffect(() => {
    setPage(1);
  }, [eventId]);

  useEffect(() => {
    setSelected({});
  }, [status, search, eventId]);

  // Close the Action menu on an outside click.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getRunRegistrationsApi({
      page,
      limit: rowsPerPage,
      search,
      status,
      ...(eventId ? { eventId } : {}),
    })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) {
          setSummary({
            registered: data.summary.registered || 0,
            scanned: data.summary.scanned || 0,
            notScanned: data.summary.notScanned || 0,
          });
        }
        setListError(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(true);
        showError(getErrorText(err, "Failed to load the run report."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, rowsPerPage, search, status, eventId, reloadKey]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await exportRunRegistrationsApi({
        status,
        search,
        ...(eventId ? { eventId } : {}),
      });
      saveBlob(blob, fileName);
      showSuccess("Run report downloaded.");
    } catch (err) {
      showError(getErrorText(err, "Unable to download the run report."));
    } finally {
      setExporting(false);
    }
  }, [status, search, eventId]);

  const selectedCount = Object.keys(selected).length;
  const allOnPage = items.length > 0 && items.every((item) => selected[item._id]);
  const someOnPage = !allOnPage && items.some((item) => selected[item._id]);

  const toggleRow = useCallback((id) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  // Header checkbox: tick / untick every row on this page.
  const togglePage = useCallback(() => {
    setSelected((prev) => {
      const next = { ...prev };
      if (items.length > 0 && items.every((item) => next[item._id])) {
        items.forEach((item) => delete next[item._id]);
      } else {
        items.forEach((item) => {
          next[item._id] = true;
        });
      }
      return next;
    });
  }, [items]);

  // "Select all N": every row of this tab / search, across all pages.
  const selectEverything = async () => {
    if (selectingAll) return;
    setSelectingAll(true);
    try {
      const res = await getRunRegistrationsApi({
        page: 1,
        limit: ALL_ROWS,
        search,
        status,
        ...(eventId ? { eventId } : {}),
      });
      const next = {};
      (res?.data?.items || []).forEach((item) => {
        next[item._id] = true;
      });
      setSelected(next);
    } catch (err) {
      showError(getErrorText(err, "Unable to select all entries."));
    } finally {
      setSelectingAll(false);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Object.keys(selected);
    if (ids.length === 0 || deleting) return;
    setMenuOpen(false);

    const confirmed = await confirmDialog({
      title: `Delete ${ids.length} ${ids.length === 1 ? "entry" : "entries"}?`,
      text:
        "The selected entries will be deleted from the Run Report for good and their QR codes will stop working. This cannot be undone.",
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await deleteRunRegistrationsApi(ids);
      showSuccess(res?.message || "Deleted.");
      const wholePageGone = items.length > 0 && items.every((item) => selected[item._id]);
      setSelected({});
      if (wholePageGone && page > 1) setPage(page - 1);
      setReloadKey((k) => k + 1);
    } catch (err) {
      showError(getErrorText(err, "Unable to delete the selected entries."));
    } finally {
      setDeleting(false);
    }
  };

  // Trash icon on a row: delete just that one entry (same effect as Delete Selected).
  const handleResendOne = async (item) => {
    setRowMenu(null);
    try {
      const res = await resendRunRegistrationApi(item._id);
      showSuccess(res?.message || "QR sent again.");
    } catch (err) {
      showError(getErrorText(err, "Unable to send the QR."));
    }
  };

  const handleDeleteOne = async (item) => {
    setRowMenu(null);
    if (deleting) return;

    const confirmed = await confirmDialog({
      title: "Delete this entry?",
      text: `${item.name} will be deleted from the Run Report for good and the QR code will stop working. This cannot be undone.`,
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await deleteRunRegistrationsApi([item._id]);
      showSuccess(res?.message || "Deleted.");
      setSelected((prev) => {
        const next = { ...prev };
        delete next[item._id];
        return next;
      });
      if (items.length === 1 && page > 1) setPage(page - 1);
      setReloadKey((k) => k + 1);
    } catch (err) {
      showError(getErrorText(err, "Unable to delete this entry."));
    } finally {
      setDeleting(false);
    }
  };

  const startIndex = total === 0 ? 0 : (page - 1) * rowsPerPage;
  const endIndex = Math.min(page * rowsPerPage, total);

  const columns = useMemo(
    () => [
      {
        key: "select",
        sortable: false,
        headerClassName: "runPage__checkCol",
        cellClassName: "runPage__checkCol",
        label: (
          <input
            type="checkbox"
            className="runPage__checkbox"
            aria-label="Select all entries on this page"
            checked={allOnPage}
            ref={(el) => {
              if (el) el.indeterminate = someOnPage;
            }}
            onChange={togglePage}
            disabled={items.length === 0}
          />
        ),
        render: (item) => (
          <input
            type="checkbox"
            className="runPage__checkbox"
            aria-label={`Select ${item.name}`}
            checked={!!selected[item._id]}
            onChange={() => toggleRow(item._id)}
          />
        ),
      },
      { key: "sr", label: "#", sortable: false, render: (_item, index) => startIndex + index + 1 },
      {
        key: "name",
        label: "Name",
        sortable: false,
        cellClassName: "companyCategoryPage__categoryName",
        render: (item) => item.name,
      },
      { key: "mobileNumber", label: "Mobile Number", sortable: false, render: (item) => displayMobile(item.mobileNumber) },
      { key: "registrationNumber", label: "Reg. No.", sortable: false, render: (item) => item.registrationNumber || "-" },
      { key: "qrNumber", label: "Invitation ID", sortable: false, render: (item) => item.qrNumber || "-" },
      {
        key: "state",
        label: "Status",
        sortable: false,
        render: (item) => (
          <span className={`runPage__badge runPage__badge--${item.state}`}>
            {item.state === "scanned" ? "Scanned" : "Not Scanned"}
          </span>
        ),
      },
      { key: "registeredAt", label: "Registered On", sortable: false, render: (item) => formatDateTime(item.registeredAt) },
      { key: "scannedAt", label: "Scanned On", sortable: false, render: (item) => formatDateTime(item.scannedAt) },
      {
        key: "actions",
        label: "Action",
        sortable: false,
        render: (item) => (
          <button
            type="button"
            data-row-action
            className="runPage__actionButton runPage__actionButton--row"
            onClick={(e) => openRowMenu(e, item)}
            disabled={deleting}
            aria-haspopup="menu"
            aria-expanded={rowMenu?.item._id === item._id}
          >
            Action
            <FaChevronDown />
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startIndex, items, selected, allOnPage, someOnPage, togglePage, toggleRow, deleting, page, rowMenu]
  );

  return (
    <>
      <div className="runPage__tabs" role="tablist" aria-label="Run report">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={`runPage__tab ${status === tab.value ? "runPage__tab--active" : ""}`}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
            <span className="runPage__tabCount">{summary[tab.value]}</span>
          </button>
        ))}
      </div>

      <div className="companyCategoryPage__tableControls">
        <CommonSelect
          className="companyCategoryPage__rowsSelect"
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(1);
          }}
          options={ROWS_PER_PAGE_OPTIONS}
        />

        <CommonSearch
          containerClassName="companyCategoryPage__searchBox"
          inputClassName="companyCategoryPage__searchInput"
          icon={<FaSearch />}
          type="text"
          placeholder="Search name, mobile, reg. no..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />

        <div className="runPage__controlButtons">
          <div className="runPage__actionWrap" ref={menuRef}>
            <button
              type="button"
              className="runPage__actionButton"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={selectedCount === 0 || deleting}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              Action
              <FaChevronDown />
            </button>
            {menuOpen && (
              <div className="runPage__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="runPage__menuItem runPage__menuItem--danger"
                  onClick={handleDeleteSelected}
                >
                  <FaTrash />
                  Delete Selected ({selectedCount})
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="runPage__exportButton"
            onClick={handleExport}
            disabled={exporting || total === 0}
          >
            <FaFileExcel />
            {exporting ? "Downloading..." : "Export Run Report"}
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="runPage__selectBar">
          <span className="runPage__selectCount">
            {selectedCount} selected
            {selectedCount < total && (
              <button type="button" className="runPage__selectLink" onClick={selectEverything} disabled={selectingAll}>
                {selectingAll ? "Selecting..." : `Select all ${total}`}
              </button>
            )}
          </span>
          <button type="button" className="runPage__selectLink" onClick={() => setSelected({})}>
            Clear selection
          </button>
        </div>
      )}

      <div className="formLinks__tableWrapper">
        <CommonTable
          columns={columns}
          data={items}
          rowKey="_id"
          loading={loading && items.length === 0}
          loadingMessage="Loading..."
          error={listError}
          errorMessage="Failed to load the run report."
          emptyMessage="No entries found."
          tableClassName="companyCategoryPage__table"
          thContentClassName="companyCategoryPage__thContent"
          sortIconClassName="companyCategoryPage__sortIcon"
        />
      </div>

      <CommonPagination
        currentPage={page}
        totalPages={totalPages}
        rangeStart={total === 0 ? 0 : startIndex + 1}
        rangeEnd={endIndex}
        totalItems={total}
        showControls={total > rowsPerPage}
        onPageSelect={(n) => setPage(n)}
        onPrevious={() => page > 1 && setPage(page - 1)}
        onNext={() => page < totalPages && setPage(page + 1)}
        prevDisabled={page === 1}
        nextDisabled={page === totalPages}
      />

      {rowMenu && (
        <div
          ref={rowMenuRef}
          className="runPage__menu runPage__menu--row"
          role="menu"
          style={{ position: "fixed", top: rowMenu.top, left: rowMenu.left, right: "auto" }}
        >
          <button type="button" role="menuitem" className="runPage__menuItem" onClick={() => handleResendOne(rowMenu.item)}>
            <FaPaperPlane />
            Resend QR
          </button>
          <button
            type="button"
            role="menuitem"
            className="runPage__menuItem runPage__menuItem--danger"
            onClick={() => handleDeleteOne(rowMenu.item)}
          >
            <FaTrash />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
