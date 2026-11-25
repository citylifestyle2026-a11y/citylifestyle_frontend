import { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaFileExcel } from "react-icons/fa";

import CommonSearch from "./CommonSearch";
import CommonSelect from "./CommonSelect";
import CommonTable from "./CommonTable";
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

  const columns = useMemo(
    () => [
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
    ],
    [startIndex]
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
    </>
  );
}
