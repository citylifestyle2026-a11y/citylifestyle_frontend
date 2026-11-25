import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaPlus, FaChevronDown, FaChartBar } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import RunRegistrationModal from "../Components/RunRegistrationModal";

import { useGlobalEvent } from "../context/EventContext";
import {
  RUN_MOCK,
  buildRunLink,
  getRunRegistrationsApi,
  resendRunRegistrationApi,
  deleteRunRegistrationApi,
  markRunScannedApi,
} from "../services/runRegistrationService";
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

const STATE_LABEL = {
  notRegistered: "Not Registered",
  notScanned: "Not Scanned",
  scanned: "Scanned",
};

const displayMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? `+91 ${digits.slice(2)}` : value || "-";
};

/**
 * Run Registration - the DATA page (Add Data, Edit, Delete, Resend).
 * Shows only the people of the event (edition) picked in the header dropdown
 * (default = the active event). The numbers / tabs / Excel live on the
 * separate "Run Report" page (/run-report).
 */
export default function RunRegistration() {
  const { effectiveEventId } = useGlobalEvent();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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

  // Load the list of the selected event.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getRunRegistrationsApi({
      page: currentPage,
      limit: rowsPerPage,
      search,
      eventId: effectiveEventId || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
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
  }, [currentPage, rowsPerPage, search, effectiveEventId, refreshKey]);

  // Close the Action dropdown on an outside click.
  const actionMenuRef = useRef(null);
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  // Keeps the open Action menu fully visible under the last row.
  const tableWrapperRef = useRef(null);
  useActionMenuRoom(tableWrapperRef, openActionMenuId, ".companyCategoryAction__menuOpen");

  // After "Add Data": clear any filter / search / page so the new person is
  // always visible at the top of the list, then reload.
  const handleAdded = useCallback(() => {
    setSearchTerm("");
    setSearch("");
    setCurrentPage(1);
    refresh();
  }, [refresh]);

  const handleCopy = useCallback(async (item) => {
    setOpenActionMenuId(null);
    const ok = await copyText(buildRunLink(item.token));
    if (ok) showSuccess("Registration link copied.");
    else showError("Could not copy. Please try again.");
  }, []);

  const handleResend = useCallback(async (item) => {
    setOpenActionMenuId(null);
    setBusyId(item._id);
    try {
      await resendRunRegistrationApi(item._id);
      showSuccess(
        item.state === "notRegistered"
          ? "Registration link sent again on WhatsApp."
          : "QR sent again on WhatsApp."
      );
      refresh();
    } catch (err) {
      showError(getErrorText(err, "Unable to send the WhatsApp message."));
      refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

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
      {
        key: "state",
        label: "Status",
        sortable: false,
        render: (item) => {
          // Why the WhatsApp message did not go (shown until it is sent again).
          const sendError = item.state === "notRegistered" ? item.linkError : item.qrError;
          return (
            <>
              <span className={`runPage__badge runPage__badge--${item.state}`}>
                {STATE_LABEL[item.state] || item.state}
              </span>
              {sendError && (
                <div className="runPage__sendError" title={sendError}>
                  {item.state === "notRegistered" ? "Link not sent" : "QR not sent"}: {sendError}
                </div>
              )}
            </>
          );
        },
      },
      { key: "createdAt", label: "Added On", sortable: false, render: (item) => formatDateTime(item.createdAt) },
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
                onClick={() => {
                  setOpenActionMenuId(null);
                  setEditItem(item);
                }}
              >
                Edit
              </button>

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
  const hasFilters = Boolean(search);

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Run Registration"
      outsideMainArea={
        <>
          {showAdd && <RunRegistrationModal onClose={() => setShowAdd(false)} onSaved={handleAdded} />}

          {editItem && (
            <RunRegistrationModal
              item={editItem}
              onClose={() => setEditItem(null)}
              onSaved={refresh}
            />
          )}

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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/run-report" className="runPage__reportLink">
              <FaChartBar />
              Run Report
            </Link>
            <button
              type="button"
              className="companyCategoryPage__createButton"
              onClick={() => setShowAdd(true)}
            >
              <FaPlus />
              Add Data
            </button>
          </div>
        }
      />

      {RUN_MOCK && (
        <div className="runPage__demo">
          DEMO MODE - data is saved only in this browser (VITE_RUN_MOCK=true). No WhatsApp is sent.
        </div>
      )}

      <div className="companyCategoryPage__tableCard appCard">
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
            placeholder="Search name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />

          {hasFilters && (
            <button
              type="button"
              className="formLinks__clearFilters"
              onClick={() => {
                setSearchTerm("");
                setSearch("");
                            setCurrentPage(1);
              }}
            >
              Clear filters
            </button>
          )}
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
