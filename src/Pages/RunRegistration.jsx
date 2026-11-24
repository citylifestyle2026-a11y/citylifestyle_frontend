import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaPlus, FaChevronDown, FaFileExcel } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import RunRegistrationModal from "../Components/RunRegistrationModal";

import {
  RUN_MOCK,
  RUN_DISTANCES,
  buildRunLink,
  getRunRegistrationsApi,
  resendRunRegistrationApi,
  deleteRunRegistrationApi,
  exportRunRegistrationsApi,
  markRunScannedApi,
} from "../services/runRegistrationService";
import { saveBlob } from "../utilits/download";
import { formatDateTime } from "../utilits/dateFormat";
import { copyText } from "../utilits/copyText";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import useClickOutside from "../hooks/useClickOutside";
import useActionMenuRoom from "../hooks/useActionMenuRoom";
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

export default function RunRegistration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");
  const status = VALID_STATUS.includes(rawStatus) ? rawStatus : "all";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [distance, setDistance] = useState(""); // "" = 5 KM + 10 KM
  const [refreshKey, setRefreshKey] = useState(0);

  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
    })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) setSummary({ ...EMPTY_SUMMARY, ...data.summary });
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
  }, [currentPage, rowsPerPage, search, status, distance, refreshKey]);

  // Close the Action dropdown on an outside click.
  const actionMenuRef = useRef(null);
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  // Keeps the open Action menu fully visible under the last row.
  const tableWrapperRef = useRef(null);
  useActionMenuRoom(tableWrapperRef, openActionMenuId, ".companyCategoryAction__menuOpen");

  const handleCopy = useCallback(async (item) => {
    setOpenActionMenuId(null);
    const ok = await copyText(buildRunLink(item.token));
    if (ok) showSuccess("Registration link copied.");
    else showError("Could not copy. Please try again.");
  }, []);

  const handleResend = useCallback(
    async (item) => {
      setOpenActionMenuId(null);
      setBusyId(item._id);
      try {
        await resendRunRegistrationApi(item._id);
        showSuccess(
          item.state === "notRegistered"
            ? "Registration link sent again on WhatsApp."
            : "QR sent again on WhatsApp."
        );
      } catch (err) {
        showError(getErrorText(err, "Unable to send the WhatsApp message."));
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  // Demo mode only.
  const handleMarkScanned = useCallback(
    async (item) => {
      setOpenActionMenuId(null);
      try {
        await markRunScannedApi(item._id);
        showSuccess("Marked as scanned (demo).");
        refresh();
      } catch (err) {
        showError(getErrorText(err, "Unable to update."));
      }
    },
    [refresh]
  );

  const handleDeleteConfirm = async () => {
    try {
      await deleteRunRegistrationApi(deleteItem._id);
      showSuccess("Deleted.");
      setDeleteItem(null);
      // Deleting the last row of the last page: step back one page.
      if (items.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else refresh();
    } catch (err) {
      showError(getErrorText(err, "Unable to delete."));
    }
  };

  // Excel of whatever tab / distance is currently selected.
  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await exportRunRegistrationsApi({ status, distance });
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
      {
        key: "action",
        label: "Actions",
        sortable: false,
        headerClassName: "appActionCol",
        cellClassName: "appActionCol",
        cellStyle: { position: "relative" },
        render: (item) => (
          <div
            className="companyCategoryAction__wrapper"
            ref={openActionMenuId === item._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="companyCategoryAction__button"
              disabled={busyId === item._id}
              onClick={() => setOpenActionMenuId((prev) => (prev === item._id ? null : item._id))}
            >
              {busyId === item._id ? "Sending..." : "Action"}
              <FaChevronDown className="companyCategoryAction__icon" />
            </button>

            <div
              className={`companyCategoryAction__menu formLinks__menu ${
                openActionMenuId === item._id ? "companyCategoryAction__menuOpen" : ""
              }`}
            >
              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleResend(item)}
              >
                {item.state === "notRegistered" ? "Resend Link" : "Resend QR"}
              </button>

              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleCopy(item)}
              >
                Copy Link
              </button>

              {RUN_MOCK && item.state === "notScanned" && (
                <button
                  type="button"
                  className="companyCategoryAction__item"
                  onClick={() => handleMarkScanned(item)}
                >
                  Mark Scanned (demo)
                </button>
              )}

              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setDeleteItem(item);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ],
    [currentPage, rowsPerPage, openActionMenuId, busyId, handleResend, handleCopy, handleMarkScanned]
  );

  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);
  const hasFilters = Boolean(search || distance || status !== "all");

  const tiles = [
    { key: "all", label: "Total Added", value: summary.total, hint: "Link sent on WhatsApp" },
    {
      key: "registered",
      label: "Registered",
      value: summary.registered,
      hint: `5 KM: ${summary.distance?.[5]?.registered ?? 0} · 10 KM: ${summary.distance?.[10]?.registered ?? 0}`,
    },
    { key: "scanned", label: "Scanned", value: summary.scanned, hint: "Entered at the gate" },
    { key: "notScanned", label: "Not Scanned", value: summary.notScanned, hint: "Registered, not yet scanned" },
    { key: "notRegistered", label: "Not Registered", value: summary.notRegistered, hint: "Link opened? Not filled yet" },
  ];

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Run Registration"
      outsideMainArea={
        <>
          {showAdd && <RunRegistrationModal onClose={() => setShowAdd(false)} onSaved={refresh} />}

          {deleteItem && (
            <DeleteUserModal
              userName={deleteItem.name}
              entityLabel="entry"
              onClose={() => setDeleteItem(null)}
              onDelete={handleDeleteConfirm}
            />
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="companyCategoryPage__topRow"
        title="Run Registration"
        titleClassName="companyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="companyCategoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="companyCategoryPage__breadcrumbActive">Run Registration</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="companyCategoryPage__createButton"
            onClick={() => setShowAdd(true)}
          >
            <FaPlus />
            Add Data
          </button>
        }
      />

      {RUN_MOCK && (
        <div className="runPage__demo">
          DEMO MODE - data is saved only in this browser (VITE_RUN_MOCK=true). No WhatsApp is sent.
        </div>
      )}

      {/* Summary tiles - click one to open that report tab */}
      <div className="runPage__tiles">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`runPage__tile ${status === tile.key ? "runPage__tile--active" : ""}`}
            onClick={() => setStatus(tile.key)}
          >
            <span className="runPage__tileValue">{tile.value}</span>
            <span className="runPage__tileLabel">{tile.label}</span>
            <span className="runPage__tileHint">{tile.hint}</span>
          </button>
        ))}
      </div>

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

          <CommonSelect
            className="runPage__distanceSelect"
            value={distance}
            onChange={(e) => {
              setDistance(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Distances"
            options={RUN_DISTANCES}
          />

          {hasFilters && (
            <button
              type="button"
              className="formLinks__clearFilters"
              onClick={() => {
                setSearchTerm("");
                setSearch("");
                setDistance("");
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

        <div className="formLinks__tableWrapper" ref={tableWrapperRef}>
          <CommonTable
            columns={columns}
            data={items}
            rowKey="_id"
            loading={loading && items.length === 0}
            loadingMessage="Loading..."
            error={listError}
            errorMessage="Failed to load the list."
            emptyMessage={
              hasFilters ? "Nothing found for the selected filters." : "No data yet. Click Add Data."
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
