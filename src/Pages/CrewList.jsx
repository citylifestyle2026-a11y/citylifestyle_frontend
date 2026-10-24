import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaChevronDown,
  FaDownload,
  FaFileExcel,
  FaTrash,
  FaWhatsapp,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import CommonEmptyState from "../Components/CommonEmptyState";
import CreateCrewModal from "../Components/CreateCrewModal";
import ImportCrewModal from "../Components/ImportCrewModal";
import SendPassModal from "../Components/SendPassModal";

import {
  getAllCrewApi,
  deleteCrewApi,
  bulkDeleteCrewApi,
  exportCrewApi,
  sendCrewPassApi,
  resendCrewPassApi,
  cancelCrewPassApi,
  bulkUpdateCrewStatusApi,
} from "../services/crewService";
import { getAllCrewCategoriesApi } from "../services/crewCategoryService";
import { confirmDialog, noticeDialog } from "../utilits/appSwal";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
import useClickOutside from "../hooks/useClickOutside";

// Same look as Guest List / Contact Book.
import "../assets/CSS/ContactList.css";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }));

const PASS_TABS = [
  { value: "", label: "All", countKey: "all", tone: "all" },
  { value: "notSent", label: "Pass Not Sent", countKey: "passNotSent", tone: "pending" },
  { value: "sent", label: "Pass Sent", countKey: "passSent", tone: "approved" },
  { value: "rejected", label: "Rejected", countKey: "rejected", tone: "rejected" },
  // Crew whose pass was cancelled (Approve Pass brings it back).
  { value: "cancelled", label: "Pass Cancelled", countKey: "passCancelled", tone: "passCancelled" },
];

const STATUS_LABELS = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

// Crew created before approval existed have no approvalStatus -> approved.
const getApprovalStatus = (member) => member?.approvalStatus || "approved";

export default function CrewList() {
  const [crew, setCrew] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    passSent: 0,
    passNotSent: 0,
    rejected: 0,
    passCancelled: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [passFilter, setPassFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState({}); // { id: crewObject }
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [formCrew, setFormCrew] = useState(undefined); // undefined = closed, null = add, object = edit
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [passCrew, setPassCrew] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const actionMenuRef = useRef(null);
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);
  const selectedList = Object.values(selected);
  const selectedCount = selectedList.length;

  // Debounce search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Category dropdown.
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllCrewCategoriesApi({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" });
        setCategories(res?.data || []);
      } catch {
        setCategories([]);
      }
    })();
  }, [refreshKey]);

  const filters = useMemo(
    () => ({
      search,
      crewCategory: categoryFilter || undefined,
      passStatus: passFilter || undefined,
    }),
    [search, categoryFilter, passFilter]
  );

  // List.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await getAllCrewApi({ ...filters, page: currentPage, limit: rowsPerPage });
        if (cancelled) return;
        setCrew(res.data || []);
        setCounts(res.counts || { all: 0, passSent: 0, passNotSent: 0, rejected: 0, passCancelled: 0 });
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(getErrorText(err, "Failed to load crew"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, currentPage, rowsPerPage, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const clearSelection = () => setSelected({});

  // ---------- selection ----------
  const allOnPageSelected = crew.length > 0 && crew.every((c) => selected[c._id]);
  const someOnPageSelected = !allOnPageSelected && crew.some((c) => selected[c._id]);

  const toggleOne = (member) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[member._id]) delete next[member._id];
      else next[member._id] = member;
      return next;
    });

  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) crew.forEach((c) => delete next[c._id]);
      else crew.forEach((c) => (next[c._id] = c));
      return next;
    });

  // ---------- actions ----------
  const handleDelete = useCallback(
    async (targets) => {
      setOpenActionMenuId(null);
      if (!targets.length || busy) return;

      const confirmed = await confirmDialog({
        title: `Delete ${targets.length} crew member${targets.length === 1 ? "" : "s"}?`,
        text: targets.length === 1 ? targets[0].fullName : "The selected crew members will be removed.",
        confirmText: "Yes, Delete",
      });
      if (!confirmed) return;

      setBusy(true);
      try {
        if (targets.length === 1) await deleteCrewApi(targets[0]._id);
        else await bulkDeleteCrewApi(targets.map((c) => c._id));
        showSuccess("Crew deleted successfully");
        setSelected((prev) => {
          const next = { ...prev };
          targets.forEach((c) => delete next[c._id]);
          return next;
        });
        refresh();
      } catch (err) {
        showError(getErrorText(err, "Failed to delete crew"));
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh]
  );

  const handleResend = useCallback(
    async (targets) => {
      setOpenActionMenuId(null);
      if (!targets.length || busy) return;
      setBusy(true);
      try {
        const res = await resendCrewPassApi(targets.map((c) => c._id));
        showSuccess(res.message || "Pass sent again");
      } catch (err) {
        showError(getErrorText(err, "Failed to resend pass"));
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  // Approve / Reject. Reject on crew with a pass = Cancel Pass (QR dies);
  // Approve on crew whose pass was cancelled = same pass comes back.
  const handleChangeStatus = useCallback(
    async (targets, status) => {
      setOpenActionMenuId(null);
      if (!targets.length || busy) return;

      const one = targets.length === 1;
      const label = one ? targets[0].fullName : `${targets.length} crew members`;

      if (status === "rejected") {
        const withPass = targets.filter((c) => c.passSentAt);
        const points = [];
        if (withPass.length) {
          points.push({
            icon: "🎟️",
            text: `${withPass.length === 1 ? "The pass that was sent is" : `${withPass.length} passes that were sent are`} CANCELLED - the QR will stop working at the gate.`,
          });
          points.push({ icon: "💬", text: 'A WhatsApp message - "your pass has been cancelled" - is sent.' });
        }
        const confirmed = await confirmDialog({
          title: `Reject: ${label}?`,
          text: points.length ? "Please check before you continue." : "The crew member moves to Rejected.",
          points,
          confirmText: "Yes, Reject",
          tone: "danger",
        });
        if (!confirmed) return;
      }

      if (status === "approved") {
        const restorable = targets.filter((c) => c.passCancelledBookingId);
        if (restorable.length) {
          const confirmed = await confirmDialog({
            title: `Approve Pass: ${restorable.length === 1 ? restorable[0].fullName : `${restorable.length} crew members`}?`,
            text: "The pass that was cancelled is brought back.",
            points: [
              { icon: "🎟️", text: "The same pass (same QR code) works again at the gate." },
              { icon: "📲", text: "The pass is sent again on WhatsApp." },
            ],
            confirmText: "Yes, Approve Pass",
            tone: "info",
          });
          if (!confirmed) return;
        }
      }

      setBusy(true);
      try {
        const res = await bulkUpdateCrewStatusApi({ ids: targets.map((c) => c._id), status });
        showSuccess(res.message || `Marked as ${STATUS_LABELS[status]}`);
        setSelected((prev) => {
          const next = { ...prev };
          targets.forEach((c) => delete next[c._id]);
          return next;
        });
        refresh();
      } catch (err) {
        showError(getErrorText(err, "Failed to update status"));
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh]
  );

  const handleCancelPass = useCallback(
    async (targets) => {
      setOpenActionMenuId(null);
      if (!targets.length || busy) return;

      const one = targets.length === 1;
      const confirmed = await confirmDialog({
        title: `Cancel pass: ${one ? targets[0].fullName : `${targets.length} crew members`}?`,
        text: one ? "This crew member's pass will be cancelled." : "These crew members' passes will be cancelled.",
        points: [
          { icon: "🎟️", text: "The pass QR code stops working at the gate straight away." },
          { icon: "↩️", text: "The seat goes back to the ticket stock." },
          { icon: "💬", text: 'A WhatsApp message - "your pass has been cancelled" - is sent.' },
          { icon: "📋", text: "The crew member moves to Rejected. Approve later to bring the same pass back." },
        ],
        confirmText: "Yes, Cancel Pass",
        tone: "danger",
      });
      if (!confirmed) return;

      setBusy(true);
      try {
        const res = await cancelCrewPassApi({ ids: targets.map((c) => c._id) });
        const data = res?.data || {};

        if (data.messageFailed) {
          await noticeDialog({
            icon: "warning",
            title: "Pass cancelled, message not sent",
            text: `${res.message}${data.messageError ? ` Reason: ${data.messageError}` : ""}`,
          });
        } else if (data.failed) {
          await noticeDialog({
            icon: "warning",
            title: "Some passes were not cancelled",
            text: `${res.message}${data.failedReason ? ` Reason: ${data.failedReason}` : ""}`,
          });
        } else {
          showSuccess(res.message || "Pass cancelled");
        }

        setSelected((prev) => {
          const next = { ...prev };
          targets.forEach((c) => delete next[c._id]);
          return next;
        });
        refresh();
      } catch (err) {
        const body = err?.response?.data;
        await noticeDialog({
          icon: "error",
          title: "Pass not cancelled",
          text: `${body?.message || err?.message || "Failed to cancel the pass."}${
            body?.data?.failedReason ? ` Reason: ${body.data.failedReason}` : ""
          }`,
        });
        refresh();
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh]
  );

  const handleExport = async () => {
    if (!total || exporting) return;
    setExporting(true);
    try {
      const ids = selectedCount > 0 ? Object.keys(selected).join(",") : undefined;
      await exportCrewApi({ ...filters, ids }, `crew-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showSuccess("Excel downloaded");
    } catch (err) {
      showError(getErrorText(err, "Failed to export Excel"));
    } finally {
      setExporting(false);
    }
  };

  // ---------- table ----------
  const columns = useMemo(
    () => [
      {
        key: "select",
        sortable: false,
        cellClassName: "contactPage__checkCol",
        label: (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label="Select all crew on this page"
            checked={allOnPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = someOnPageSelected;
            }}
            onChange={toggleAllOnPage}
            disabled={crew.length === 0}
          />
        ),
        render: (member) => (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label={`Select ${member.fullName}`}
            checked={!!selected[member._id]}
            onChange={() => toggleOne(member)}
          />
        ),
      },
      { key: "fullName", label: "Full Name", sortable: false, render: (m) => <b>{m.fullName}</b> },
      { key: "whatsappNumber", label: "WhatsApp Number", sortable: false, render: (m) => m.whatsappNumber || "-" },
      { key: "category", label: "Crew Category", sortable: false, render: (m) => m.crewCategory?.name || "-" },
      { key: "designation", label: "Designation", sortable: false, render: (m) => m.designation || "-" },
      { key: "area", label: "Area", sortable: false, render: (m) => m.area || "-" },
      {
        key: "approvalStatus",
        label: "Status",
        sortable: false,
        render: (m) => {
          const status = getApprovalStatus(m);
          return (
            <span className="contactPage__statusCell">
              <span className={`contactPage__statusBadge contactPage__statusBadge--${status}`}>
                {STATUS_LABELS[status]}
              </span>
              {status === "rejected" && m.passCancelledAt && (
                <span
                  className="contactPage__passCancelledTag"
                  title={`Pass cancelled on ${new Date(m.passCancelledAt).toLocaleString("en-GB")}`}
                >
                  <FaTimes /> Pass cancelled
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "pass",
        label: "Pass",
        sortable: false,
        render: (m) => (
          <span
            className={`contactPage__hamperTag ${m.passSentAt ? "contactPage__hamperTag--sent" : ""}`}
            title={m.passSentAt ? `Sent on ${new Date(m.passSentAt).toLocaleString("en-GB")}` : "Pass not sent yet"}
          >
            {m.passSentAt ? `Pass sent (${m.passQuantity || 1})` : "Not sent"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        cellStyle: { position: "relative" },
        render: (m) => (
          <div className="contactAction__wrapper" ref={openActionMenuId === m._id ? actionMenuRef : null}>
            <button
              type="button"
              className="contactAction__button"
              onClick={() => setOpenActionMenuId((prev) => (prev === m._id ? null : m._id))}
            >
              Action <FaChevronDown className="contactAction__icon" />
            </button>

            <div className={`contactAction__menu ${openActionMenuId === m._id ? "contactAction__menuOpen" : ""}`}>
              {getApprovalStatus(m) !== "approved" && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemApprove"
                  onClick={() => handleChangeStatus([m], "approved")}
                >
                  {m.passCancelledBookingId ? "Approve Pass" : "Approve"}
                </button>
              )}
              {getApprovalStatus(m) === "approved" && m.passSentAt && (
                <button type="button" className="contactAction__item contactAction__itemApprove" onClick={() => handleResend([m])}>
                  Resend Pass
                </button>
              )}
              {getApprovalStatus(m) === "approved" && !m.passSentAt && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemApprove"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setPassCrew([m]);
                  }}
                >
                  Send Pass
                </button>
              )}
              {getApprovalStatus(m) === "approved" && m.passSentAt && (
                <button type="button" className="contactAction__item contactAction__itemReject" onClick={() => handleCancelPass([m])}>
                  Cancel Pass
                </button>
              )}
              {getApprovalStatus(m) !== "rejected" && !m.passSentAt && (
                <button type="button" className="contactAction__item contactAction__itemReject" onClick={() => handleChangeStatus([m], "rejected")}>
                  Reject
                </button>
              )}
              <button
                type="button"
                className="contactAction__item"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setFormCrew(m);
                }}
              >
                Edit
              </button>
              <button type="button" className="contactAction__item contactAction__itemReject" onClick={() => handleDelete([m])}>
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crew, selected, allOnPageSelected, someOnPageSelected, openActionMenuId, handleDelete, handleResend, handleChangeStatus, handleCancelPass]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c._id, label: c.name })),
    [categories]
  );

  const approvedList = selectedList.filter((c) => getApprovalStatus(c) === "approved");
  const unsentSelected = approvedList.filter((c) => !c.passSentAt);
  const sentSelected = approvedList.filter((c) => c.passSentAt);
  const approvableSelected = selectedList.filter((c) => getApprovalStatus(c) !== "approved");
  const rejectableSelected = selectedList.filter((c) => getApprovalStatus(c) !== "rejected" && !c.passSentAt);

  return (
    <CommonListLayout
      pageClassName="contactPage__page"
      mainAreaClassName="contactPage__mainArea"
      contentClassName="contactPage__content"
      headerTitle="Crew"
      outsideMainArea={
        <>
          {formCrew !== undefined && (
            <CreateCrewModal crew={formCrew} onClose={() => setFormCrew(undefined)} onSaved={refresh} />
          )}

          {isImportOpen && (
            <ImportCrewModal onClose={() => setIsImportOpen(false)} onSuccess={refresh} />
          )}

          {passCrew && (
            <SendPassModal
              contacts={passCrew}
              sendPass={sendCrewPassApi}
              onClose={() => setPassCrew(null)}
              onDone={() => {
                clearSelection();
                refresh();
              }}
            />
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="contactPage__topRow"
        title="Crew"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Crew</span>
          </div>
        }
        actions={
          <div className="contactPage__headerActions">
            <button type="button" className="contactPage__createButton" onClick={() => setFormCrew(null)}>
              <FaPlus /> Add Crew
            </button>
            <button
              type="button"
              className="contactPage__createButton"
              onClick={handleExport}
              disabled={!total || exporting}
            >
              <FaDownload />
              {exporting ? "Exporting..." : `Export Excel (${selectedCount > 0 ? selectedCount : total})`}
            </button>
            <button type="button" className="contactPage__createButton" onClick={() => setIsImportOpen(true)}>
              <FaFileExcel /> Import Excel / CSV
            </button>
          </div>
        }
      />

      <div className="contactPage__tableCard appCard">
        <div className="contactPage__statusTabs" role="tablist">
          {PASS_TABS.map((tab) => (
            <button
              key={tab.countKey}
              type="button"
              role="tab"
              aria-selected={passFilter === tab.value}
              className={`contactPage__statusTab contactPage__statusTab--${tab.tone} ${
                passFilter === tab.value ? "contactPage__statusTabActive" : ""
              }`}
              onClick={() => {
                setPassFilter(tab.value);
                setCurrentPage(1);
              }}
            >
              {tab.label}
              <span className="contactPage__statusTabCount">{counts[tab.countKey] ?? 0}</span>
            </button>
          ))}
        </div>

        {selectedCount > 0 && (
          <div className="contactPage__bulkBar">
            <span className="contactPage__bulkCount">{selectedCount} selected</span>
            <div className="contactPage__bulkButtons">
              {approvableSelected.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                  disabled={busy}
                  onClick={() => handleChangeStatus(approvableSelected, "approved")}
                >
                  <FaCheck /> Approve ({approvableSelected.length})
                </button>
              )}
              {unsentSelected.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                  disabled={busy}
                  onClick={() => setPassCrew(unsentSelected)}
                >
                  <FaWhatsapp /> Send Pass ({unsentSelected.length})
                </button>
              )}
              {sentSelected.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--pending"
                  disabled={busy}
                  onClick={() => handleResend(sentSelected)}
                >
                  <FaWhatsapp /> Resend Pass ({sentSelected.length})
                </button>
              )}
              {sentSelected.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                  disabled={busy}
                  onClick={() => handleCancelPass(sentSelected)}
                >
                  <FaTimes /> Cancel Pass ({sentSelected.length})
                </button>
              )}
              {rejectableSelected.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                  disabled={busy}
                  onClick={() => handleChangeStatus(rejectableSelected, "rejected")}
                >
                  <FaTimes /> Reject ({rejectableSelected.length})
                </button>
              )}
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                disabled={busy}
                onClick={() => handleDelete(selectedList)}
              >
                <FaTrash /> Delete ({selectedCount})
              </button>
              <button type="button" className="contactPage__bulkBtn contactPage__bulkBtn--clear" onClick={clearSelection}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="contactPage__tableControls">
          <CommonSelect
            className="contactPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="contactPage__searchBox"
            inputClassName="contactPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name, mobile, designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <CommonSelect
            className="contactPage__filterSelect"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Categories"
            options={categoryOptions}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={columns}
            data={crew}
            rowKey="_id"
            loading={loading && crew.length === 0}
            loadingMessage="Loading crew..."
            error={error}
            errorMessage="Failed to load crew."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="contactPage__stateWrap"
                textClassName="contactPage__stateText"
                message="No crew found. Use Add Crew or Import Excel / CSV to add crew members."
              />
            }
            stateCellClassName="contactPage__stateCell"
            stateCellStyle={{}}
            rowClassName={(m) => (openActionMenuId === m._id ? "contactPage__rowActive" : "")}
            tableClassName="contactPage__table"
            thContentClassName="contactPage__thContent"
            sortIconClassName="contactPage__sortIcon"
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
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === totalPages}
        />
      </div>
    </CommonListLayout>
  );
}