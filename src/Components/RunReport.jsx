import { useCallback, useEffect, useState } from "react";
import { FaSearch, FaFileExcel } from "react-icons/fa";

import CommonSearch from "./CommonSearch";
import CommonSelect from "./CommonSelect";
import CommonPagination from "./CommonPagination";
import {
  getRunRegistrationsApi,
  exportRunRegistrationsApi,
} from "../services/runRegistrationService";
import { saveBlob } from "../utilits/download";
import { formatDateTime } from "../utilits/dateFormat";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { ALL_ROWS_OPTION } from "../utilits/rowsPerPage";
import "../assets/CSS/RunRegistration.css";

// Let's Run report body (page: Pages/RunReportPage.jsx). Who registered, who was scanned at the gate and who registered
// but has not been scanned (yet).
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }));
ROWS_PER_PAGE_OPTIONS.push(ALL_ROWS_OPTION);

// Only these three views: everyone who registered, who registered but was not
// scanned at the gate, and who was scanned.
const TABS = [
  { value: "registered", label: "Registered" },
  { value: "notScanned", label: "Registered, Not Scanned" },
  { value: "scanned", label: "Scanned" },
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
  }, [page, rowsPerPage, search, status, eventId]);

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

  const startIndex = total === 0 ? 0 : (page - 1) * rowsPerPage;
  const endIndex = Math.min(page * rowsPerPage, total);

  return (
    <div className="runReport">
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

      <div className="runReport__toolbar">
        <CommonSelect
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(1);
          }}
          options={ROWS_PER_PAGE_OPTIONS}
        />

        <CommonSearch
          icon={<FaSearch />}
          type="text"
          placeholder="Search name, mobile, reg. no..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />

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

      <div className="runReport__tableWrap">
        <table className="runReport__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Mobile Number</th>
              <th>Reg. No.</th>
              <th>Invitation ID</th>
              <th>Status</th>
              <th>Registered On</th>
              <th>Scanned On</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="runReport__empty">Loading...</td>
              </tr>
            ) : listError ? (
              <tr>
                <td colSpan={8} className="runReport__empty">Failed to load the run report.</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="runReport__empty">No entries found.</td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item._id}>
                  <td>{startIndex + index + 1}</td>
                  <td>{item.name}</td>
                  <td>{displayMobile(item.mobileNumber)}</td>
                  <td>{item.registrationNumber || "-"}</td>
                  <td>{item.qrNumber || "-"}</td>
                  <td>
                    <span className={`runPage__badge runPage__badge--${item.state}`}>
                      {item.state === "scanned" ? "Scanned" : "Not Scanned"}
                    </span>
                  </td>
                  <td>{formatDateTime(item.registeredAt)}</td>
                  <td>{formatDateTime(item.scannedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    </div>
  );
}
