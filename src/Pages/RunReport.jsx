import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaFileExcel, FaRunning } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import MultiSelect from "../Components/MultiSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";

import { useGlobalEvent } from "../context/EventContext";
import {
  RUN_MOCK,
  RUN_DISTANCES,
  getRunRegistrationsApi,
  exportRunRegistrationsApi,
} from "../services/runRegistrationService";
import { saveBlob } from "../utilits/download";
import { formatDateTime } from "../utilits/dateFormat";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { ALL_ROWS_OPTION } from "../utilits/rowsPerPage";

// The table, header and search box reuse the Company Category page styles.
import "../assets/CSS/CompanyCategory.css";
import "../assets/CSS/FormLinks.css";
import "../assets/CSS/RunRegistration.css";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }));
ROWS_PER_PAGE_OPTIONS.push(ALL_ROWS_OPTION);

// The tabs ARE the report: who registered, who was scanned at the gate and
// who registered but never came. `status` is also the ?status= address
// parameter, so the Dashboard can link straight to a tab.
const TABS = [
  { value: "all", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "scanned", label: "Scanned" },
  { value: "notScanned", label: "Registered, Not Scanned" },
  { value: "notRegistered", label: "Not Registered" },
];
const VALID_STATUS = TABS.map((t) => t.value);

const STATE_LABEL = {
  notRegistered: "Not Registered",
  notScanned: "Not Scanned",
  scanned: "Scanned",
};

const EMPTY_SUMMARY = {
  total: 0,
  registered: 0,
  scanned: 0,
  notScanned: 0,
  notRegistered: 0,
  distance: { 5: { registered: 0, scanned: 0 }, 10: { registered: 0, scanned: 0 } },
};

const displayMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? `+91 ${digits.slice(2)}` : value || "-";
};

/**
 * Run Report - its own page (/run-report). Read only: numbers, the
 * Registered / Scanned / Registered-not-scanned / Not-registered tabs and the
 * Excel download, for the event (edition) picked in the header dropdown.
 */
export default function RunReport() {
  const { effectiveEventId } = useGlobalEvent();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");
  const status = VALID_STATUS.includes(rawStatus) ? rawStatus : "all";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [eventInfo, setEventInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [distances, setDistances] = useState([]); // [] or both = 5 KM + 10 KM
  // The backend takes one distance; none / both selected means "all".
  const distance = distances.length === 1 ? distances[0] : "";
  const [exporting, setExporting] = useState(false);

  const setStatus = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      if (value === "all") next.delete("status");
      else next.set("status", value);
      setSearchParams(next, { replace: true });
      setCurrentPage(1);
    },
    [searchParams, setSearchParams]
  );

  // Another event (edition) picked in the header -> start again from page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveEventId]);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load the list (and the summary numbers shown in the tabs / tiles).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getRunRegistrationsApi({
      page: currentPage,
      limit: rowsPerPage,
      search,
      status,
      distance,
      eventId: effectiveEventId || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
        setEventInfo(data.event || null);
        setListError(false);
      })
      .catch(() => {
        if (!cancelled) setListError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, rowsPerPage, search, status, distance, effectiveEventId]);

  // Excel of whatever tab / distance / search is currently selected.
  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await exportRunRegistrationsApi({
        status,
        distance,
        search,
        eventId: effectiveEventId || undefined,
      });
      saveBlob(blob, fileName);
      showSuccess("Report downloaded.");
    } catch (err) {
      showError(getErrorText(err, "Unable to download the report."));
    } finally {
      setExporting(false);
    }
  };

  const tabCount = {
    all: summary.total,
    registered: summary.registered,
    scanned: summary.scanned,
    notScanned: summary.notScanned,
    notRegistered: summary.notRegistered,
  };

  const columns = useMemo(
    () => [
      {
        key: "sr",
        label: "#",
        sortable: false,
        render: (_item, index) => (currentPage - 1) * (rowsPerPage || 0) + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortable: false,
        cellClassName: "companyCategoryPage__categoryName",
        render: (item) => item.name,
      },
      { key: "mobileNumber", label: "Mobile", sortable: false, render: (item) => displayMobile(item.mobileNumber) },
      { key: "email", label: "Email", sortable: false, render: (item) => item.email || "-" },
      {
        key: "distance",
        label: "Distance",
        sortable: false,
        render: (item) =>
          item.distance ? (
            <span className={`runPage__km runPage__km--${item.distance}`}>{item.distance} KM</span>
          ) : (
            "-"
          ),
      },
      { key: "registrationNumber", label: "Reg. No.", sortable: false, render: (item) => item.registrationNumber || "-" },
      {
        key: "state",
        label: "Status",
        sortable: false,
        render: (item) => (
          <span className={`runPage__badge runPage__badge--${item.state}`}>
            {STATE_LABEL[item.state] || item.state}
          </span>
        ),
      },
      { key: "registeredAt", label: "Registered On", sortable: false, render: (item) => formatDateTime(item.registeredAt) },
      { key: "scannedAt", label: "Scanned On", sortable: false, render: (item) => formatDateTime(item.scannedAt) },
    ],
    [currentPage, rowsPerPage]
  );

  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);
  const hasFilters = Boolean(search || distances.length || status !== "all");

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Run Report"
    >
      <CommonPageHeader
        containerClassName="companyCategoryPage__topRow"
        title="Run Report"
        titleClassName="companyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="companyCategoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <Link to="/run-registration" className="appBreadcrumbLink">Run Registration</Link>
            <span>-</span>
            <span className="companyCategoryPage__breadcrumbActive">Run Report</span>
          </div>
        }
        actions={
          <Link to="/run-registration" className="runPage__reportLink">
            <FaRunning />
            Run Registration
          </Link>
        }
      />

      {RUN_MOCK && (
        <div className="runPage__demo">
          DEMO MODE - data is saved only in this browser (VITE_RUN_MOCK=true). No WhatsApp is sent.
        </div>
      )}

      {eventInfo && (
        <p className="runPage__eventLine">
          Event: <strong>{eventInfo.title}</strong>
        </p>
      )}

      <div className="companyCategoryPage__tableCard appCard">
        <div className="runPage__tabs" role="tablist" aria-label="Report">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={`runPage__tab ${status === tab.value ? "runPage__tab--active" : ""}`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
              <span className="runPage__tabCount">{tabCount[tab.value]}</span>
            </button>
          ))}
        </div>

        <div className="companyCategoryPage__tableControls">
          <CommonSelect
            className="companyCategoryPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="companyCategoryPage__searchBox"
            inputClassName="companyCategoryPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name, mobile, email, reg. no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />

          <MultiSelect
            value={distances}
            onChange={(next) => {
              setDistances(next);
              setCurrentPage(1);
            }}
            placeholder="All Distances"
            searchPlaceholder="Search distance..."
            options={RUN_DISTANCES.map((d) => ({ value: String(d.value), label: d.label }))}
          />

          {hasFilters && (
            <button
              type="button"
              className="formLinks__clearFilters"
              onClick={() => {
                setSearchTerm("");
                setSearch("");
                setDistances([]);
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          )}

          <button
            type="button"
            className="runPage__exportButton"
            onClick={handleExport}
            disabled={exporting || total === 0}
          >
            <FaFileExcel />
            {exporting ? "Downloading..." : "Download Report"}
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
            errorMessage="Failed to load the report."
            emptyMessage={
              hasFilters ? "Nothing found for the selected filters." : "No data yet for this event."
            }
            tableClassName="companyCategoryPage__table"
            thContentClassName="companyCategoryPage__thContent"
            sortIconClassName="companyCategoryPage__sortIcon"
          />
        </div>

        <CommonPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={total === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={total}
          showControls={total > rowsPerPage}
          onPageSelect={(page) => setCurrentPage(page)}
          onPrevious={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
          onNext={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === totalPages}
        />
      </div>
    </CommonListLayout>
  );
}
