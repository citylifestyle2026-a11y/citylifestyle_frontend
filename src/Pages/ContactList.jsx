import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaSearch,
  FaPlus,
  FaChevronDown,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaWhatsapp,
  FaCheck,
  FaTimes,
  FaClock,
  FaFileCsv,
} from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import CreateContactModal from "../Components/CreateContactModal";
import ContactDetailsModal from "../Components/ContactDetailsModal";
import CommonExportButton from "../Components/CommonExportButton";
import SendPassModal from "../Components/SendPassModal";
import ImportContactsModal from "../Components/ImportContactsModal";
import useEditionOptions from "../hooks/useEditionOptions";
import MultiSelect from "../Components/MultiSelect";
import { ContactPerson, InstagramLink } from "../Components/ContactAvatar";

import {
  getAllContacts,
  getUniqueReferences,
  getReferenceSummary,
  deleteContact,
  exportContacts,
  bulkUpdateContactStatus,
} from "../redux/contact/contactThunk";
import { clearContactState } from "../redux/contact/contactSlice";
import { getAllCompanyCategories } from "../redux/companyCategory/companyCategoryThunk";

import { showError, showSuccess } from "../utilits/toast";
import {
  resendContactPassApi,
  deleteContactBookingApi,
  cancelContactPassApi,
} from "../services/contactService";
import { confirmDialog, noticeDialog } from "../utilits/appSwal";
import "../assets/CSS/ContactList.css";

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific
// options — same as ROWS_PER_PAGE_OPTIONS in Pages/User.jsx.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

// The Company Category filter needs the full category list in one go, not
// a paginated slice — the backend's get-all-categories endpoint is
// paginated (default limit 10), so a high explicit limit is passed here.
// This is only the filter dropdown's data source; Company Category
// management UI is a separate step.
const CATEGORY_FILTER_FETCH_LIMIT = 100;

// Only these fields are sortable server-side (see SORTABLE_FIELDS in
// services/contact.service.js). Columns outside this list render a plain,
// non-interactive header rather than a sort affordance that the API would
// silently ignore and fall back to `createdAt` for.
// Approval filter tabs. "" = all contacts.
const STATUS_TABS = [
  { value: "", label: "All", countKey: "all" },
  { value: "pending", label: "Pending", countKey: "pending" },
  { value: "approved", label: "Approved", countKey: "approved" },
  { value: "rejected", label: "Rejected", countKey: "rejected" },
];

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

// Contacts created before approval existed have no approvalStatus -> approved.
const getApprovalStatus = (contact) => contact?.approvalStatus || "approved";

const SORTABLE_COLUMNS = ["fullName", "whatsappNumber", "companyName", "designation", "area"];

export default function ContactList() {
  const dispatch = useDispatch();

  const {
    contacts,
    loading,
    listError: error,
    total,
    totalPages,
    limit,
    uniqueReferences,
    uniqueReferencesLoading,
    referenceSummary,
    exportLoading,
    statusCounts,
  } = useSelector((state) => state.contact);

  const { companyCategories } = useSelector((state) => state.companyCategory);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // searchTerm tracks the raw input value; search is the debounced value
  // actually sent to the API — same pattern as User.jsx/Event.jsx.
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");

  // Filters. Empty string = "no filter", which is why both are omitted
  // from the request params below rather than sent as "".
  const [categoryFilter, setCategoryFilter] = useState("");
  // Several references can be ticked; a guest matches when it has ANY of them.
  const [referenceFilter, setReferenceFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  // Edition (event) the guests were moved into from Member List. Can be
  // preset with /contact-list?edition=<eventId>.
  const [searchParams] = useSearchParams();
  const [editionFilter, setEditionFilter] = useState(
    searchParams.get("edition") || ""
  );
  // Only editions of active events (the selected one always stays listed).
  const { editions: editionOptions, loading: editionsLoading } =
    useEditionOptions({ activeOnly: true, include: editionFilter });

  // Checkbox selection (id -> contact). Kept across pages so many contacts
  // can be approved / rejected / sent a pass in one go.
  const [selected, setSelected] = useState({});
  const [statusBusy, setStatusBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Contacts the "Send Pass" modal is open for (null = closed).
  const [passContacts, setPassContacts] = useState(null);

  // CSV import modal.
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting. Defaults mirror the backend's own defaults so the first
  // render and the API agree without sending redundant params.
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Tracks which row's Action dropdown is currently open.
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  // Contact whose pass is currently being re-sent (disables its menu item).
  const [resendBusyId, setResendBusyId] = useState(null);

  // Delete modal state.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState(null);
  const [deleteContactName, setDeleteContactName] = useState("");

  // Create/Edit modal state — a single modal instance handles both modes
  // (see CreateContactModal's own isEditMode prop), same pattern as
  // CreateUserModal.jsx.
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedContact, setSelectedContact] = useState(null);

  // View modal state.
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewContact, setViewContact] = useState(null);

  const effectiveLimit = limit || rowsPerPage;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * effectiveLimit;
  const endIndex = Math.min(currentPage * effectiveLimit, total);
  const resolvedTotalPages = totalPages || 1;

  // Debounce the search input before it affects the API call / page reset.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch contacts. Filters are only included when actually set, so an
  // unset filter never reaches the backend as an empty string (which
  // getAllContacts would have to defensively ignore anyway).
  useEffect(() => {
    const params = {
      page: currentPage,
      limit: rowsPerPage,
      search,
      sortBy,
      sortOrder,
    };

    if (categoryFilter) params.companyCategory = categoryFilter;
    if (referenceFilter.length) params.reference = referenceFilter;
    if (statusFilter) params.approvalStatus = statusFilter;
    if (editionFilter) params.editionEventId = editionFilter;

    dispatch(getAllContacts(params));
  }, [
    dispatch,
    currentPage,
    rowsPerPage,
    search,
    sortBy,
    sortOrder,
    categoryFilter,
    referenceFilter,
    statusFilter,
    editionFilter,
    refreshKey,
  ]);

  // Filter dropdown data. Both are fetched once on mount — neither depends
  // on the list's own page/search state, so refetching them on every list
  // change would only add requests without changing the options.
  useEffect(() => {
    dispatch(getUniqueReferences({}));
    dispatch(
      getAllCompanyCategories({ page: 1, limit: CATEGORY_FILTER_FETCH_LIMIT })
    );
  }, [dispatch]);

  // Reference -> contact-names grouping data, used to enrich each
  // contact's own Reference chips below (see referenceContactsByKey /
  // contactTableColumns' "references" column) so a reference shared by
  // multiple contacts shows every contact name that holds it, right
  // inside the existing Contact List table — no separate section.
  // Fetched once on mount for the same reason as the filter dropdown
  // data above — it reflects every active contact, not just the current
  // page/search/filter selection.
  useEffect(() => {
    dispatch(getReferenceSummary());
  }, [dispatch]);

  // Ref for detecting outside clicks to close the action dropdown —
  // same pattern as actionMenuRef in Pages/User.jsx.
  const actionMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleActionMenu = useCallback((contactId) => {
    setOpenActionMenuId((prev) => (prev === contactId ? null : contactId));
  }, []);

  // Clicking the same column flips direction; clicking a new column starts
  // it ascending. Either way the list returns to page 1, since row 1 of the
  // new ordering is almost never on the page the admin was already on.
  const handleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prevField;
      }

      setSortOrder("asc");
      return field;
    });

    setCurrentPage(1);
  }, []);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < resolvedTotalPages) setCurrentPage(currentPage + 1);
  };

  // Export uses the CURRENT search/sort/filters — same values already
  // sent to getAllContacts above — so the downloaded file always
  // matches exactly what the table is showing (not just every contact
  // unfiltered). Page/limit are intentionally omitted: every matching
  // contact is exported, not just the current page.
  const handleExport = () => {
    const params = {
      search,
      sortBy,
      sortOrder,
    };

    if (categoryFilter) params.companyCategory = categoryFilter;
    if (referenceFilter.length) params.reference = referenceFilter;
    if (statusFilter) params.approvalStatus = statusFilter;
    if (editionFilter) params.editionEventId = editionFilter;

    dispatch(exportContacts(params));
  };

  const handleCreateClick = () => {
    setSelectedContact(null);
    setFormModalMode("create");
    setIsFormModalOpen(true);
  };

  const handleViewClick = useCallback((contact) => {
    setOpenActionMenuId(null);
    setViewContact(contact);
    setIsViewModalOpen(true);
  }, []);

  const handleEditClick = useCallback((contact) => {
    setOpenActionMenuId(null);
    setSelectedContact(contact);
    setFormModalMode("edit");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedContact(null);
    setFormModalMode("create");
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewContact(null);
  };

  const handleDeleteClick = useCallback((contact) => {
    setDeleteContactId(contact._id);
    setDeleteContactName(contact.fullName);
    setIsDeleteOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteContactId(null);
    setDeleteContactName("");
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteContact(deleteContactId)).unwrap();

      showSuccess(res.message || "Contact deleted successfully");

      // Refetch using the list's CURRENT page/limit/search/sort/filters
      // rather than resetting them, so a delete doesn't yank the admin
      // back to page 1 — same reasoning as User.jsx's delete flow.
      const params = {
        page: currentPage,
        limit: rowsPerPage,
        search,
        sortBy,
        sortOrder,
      };

      if (categoryFilter) params.companyCategory = categoryFilter;
      if (referenceFilter.length) params.reference = referenceFilter;
      if (statusFilter) params.approvalStatus = statusFilter;
      if (editionFilter) params.editionEventId = editionFilter;

      dispatch(getAllContacts(params));

      // A deleted contact may have been the only holder of one of its
      // references, in which case that value is no longer a valid filter
      // option — refresh the dropdown so it can't offer a reference that
      // would now return zero rows.
      dispatch(getUniqueReferences({}));

      // Same reasoning for the grouped Reference Summary section below
      // the table — a deleted contact's name (or an entire reference row
      // it was the sole holder of) must disappear from it too.
      dispatch(getReferenceSummary());

      dispatch(clearContactState());

      handleCloseDeleteModal();
    } catch (err) {
      showError(err || "Failed to delete contact");
    }
  };

  // ---------- Approval + selection ----------

  const selectedContacts = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedContacts.length;

  // Approved guests who already have a pass -> can have it cancelled.
  const selectedCancellable = useMemo(
    () =>
      selectedContacts.filter(
        (contact) =>
          getApprovalStatus(contact) === "approved" && contact.passSentAt
      ),
    [selectedContacts]
  );

  // An approved guest can no longer be "rejected" (use Cancel Pass instead).
  const selectedRejectable = useMemo(
    () =>
      selectedContacts.filter(
        (contact) => getApprovalStatus(contact) === "pending"
      ),
    [selectedContacts]
  );

  const selectedApproved = useMemo(
    () =>
      selectedContacts.filter(
        (contact) =>
          getApprovalStatus(contact) === "approved" && !contact.passSentAt
      ),
    [selectedContacts]
  );

  const allOnPageSelected =
    contacts.length > 0 && contacts.every((contact) => selected[contact._id]);
  const someOnPageSelected =
    !allOnPageSelected && contacts.some((contact) => selected[contact._id]);

  const handleToggleSelect = useCallback((contact) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[contact._id]) delete next[contact._id];
      else next[contact._id] = contact;
      return next;
    });
  }, []);

  const handleToggleSelectAll = () => {
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) {
        contacts.forEach((contact) => delete next[contact._id]);
      } else {
        contacts.forEach((contact) => {
          next[contact._id] = contact;
        });
      }
      return next;
    });
  };

  const clearSelection = () => setSelected({});

  // One function for both the row menu (1 contact) and the bulk bar (many).
  const handleChangeStatus = useCallback(
    async (targets, status) => {
      if (!targets.length || statusBusy) return;

      setOpenActionMenuId(null);

      // Themed (SweetAlert) confirmation before cancelling a pass that was
      // already sent, and before the automatic "next Parv" WhatsApp message
      // goes out on Reject.
      if (status !== "approved") {
        const withPass = targets.filter((contact) => contact.passSentAt);
        const newlyRejected =
          status === "rejected"
            ? targets.filter((contact) => getApprovalStatus(contact) !== "rejected")
            : [];
        const points = [];

        if (withPass.length) {
          points.push({
            icon: "🎟️",
            text: `${withPass.length === 1 ? "The pass that was sent is" : `${withPass.length} passes that were sent are`} CANCELLED - the QR will stop working at the gate.`,
          });
        }

        if (newlyRejected.length) {
          points.push({
            icon: "💬",
            text: `A polite WhatsApp message ("we will invite you to the next Parv") is sent to ${newlyRejected.length === 1 ? "this contact" : `${newlyRejected.length} contacts`}.`,
          });
        }

        if (points.length) {
          const one = targets.length === 1;
          const confirmed = await confirmDialog({
            title: `${status === "rejected" ? "Reject" : "Move to Pending"}: ${one ? targets[0].fullName : `${targets.length} contacts`}?`,
            text: "Please check before you continue.",
            points,
            confirmText: status === "rejected" ? "Yes, Reject" : "Yes, Move to Pending",
            tone: status === "rejected" ? "danger" : "warning",
          });

          if (!confirmed) return;
        }
      }

      setStatusBusy(true);

      try {
        const res = await dispatch(
          bulkUpdateContactStatus({
            ids: targets.map((contact) => contact._id),
            status,
          })
        ).unwrap();

        // The status change always goes through. If the rejection WhatsApp
        // could not be delivered, say so clearly (with the reason) instead
        // of a toast that is easy to miss.
        if (res?.data?.rejectionFailed) {
          await noticeDialog({
            icon: "warning",
            title: "Status updated, message not sent",
            text: `Marked as ${STATUS_LABELS[status]}, but the WhatsApp message could not be delivered to ${res.data.rejectionFailed} contact${res.data.rejectionFailed === 1 ? "" : "s"}.${res.data.rejectionError ? ` Reason: ${res.data.rejectionError}` : ""}`,
            hint: res.data.rejectionUsedTemplate
              ? "Check that the template name in .env is approved and the language matches."
              : "A normal WhatsApp text only reaches people who messaged your number in the last 24 hours. Create an approved template and set CHATBOX_REJECTION_TEMPLATE_NAME in the backend .env.",
          });
        } else {
          showSuccess(res.message || `Marked as ${STATUS_LABELS[status]}`);
        }

        setSelected((prev) => {
          const next = { ...prev };
          targets.forEach((contact) => delete next[contact._id]);
          return next;
        });

        setRefreshKey((key) => key + 1);
      } catch (err) {
        showError(err || "Failed to update status");
      } finally {
        setStatusBusy(false);
      }
    },
    [dispatch, statusBusy]
  );

  // Cancels the pass of approved guest(s): the QR stops working, the guest
  // moves to Rejected and receives a "your pass has been cancelled"
  // WhatsApp message (see POST /contacts/cancel-pass).
  const handleCancelPass = useCallback(
    async (targets) => {
      if (!targets.length || statusBusy) return;
      setOpenActionMenuId(null);

      const one = targets.length === 1;
      const confirmed = await confirmDialog({
        title: `Cancel pass: ${one ? targets[0].fullName : `${targets.length} guests`}?`,
        text: one
          ? "This guest's pass will be cancelled."
          : "These guests' passes will be cancelled.",
        points: [
          { icon: "🎟️", text: "The pass QR code stops working at the gate straight away." },
          { icon: "↩️", text: "The seat goes back to the ticket stock." },
          {
            icon: "💬",
            text: `A WhatsApp message - "your pass has been cancelled" - is sent to ${one ? "the guest" : "each guest"}.`,
          },
          { icon: "📋", text: "The guest moves to Rejected. You can approve and send a new pass later." },
        ],
        confirmText: "Yes, Cancel Pass",
        tone: "danger",
      });

      if (!confirmed) return;

      setStatusBusy(true);

      try {
        const res = await cancelContactPassApi({
          ids: targets.map((contact) => contact._id),
        });
        const data = res?.data || {};

        if (data.messageFailed) {
          await noticeDialog({
            icon: "warning",
            title: "Pass cancelled, message not sent",
            text: `${res.message}${data.messageError ? ` Reason: ${data.messageError}` : ""}`,
            hint: data.usedTemplate
              ? "Check that the template name in .env is approved and the language matches."
              : "A normal WhatsApp text only reaches people who messaged your number in the last 24 hours. Create an approved template and set CHATBOX_PASS_CANCEL_TEMPLATE_NAME in the backend .env.",
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
          targets.forEach((contact) => delete next[contact._id]);
          return next;
        });
        setRefreshKey((key) => key + 1);
      } catch (err) {
        const body = err?.response?.data;

        if (err?.response?.status === 404 && !body?.message) {
          showError("Cancel Pass is not available on the server yet - please deploy / restart the backend.");
        } else {
          await noticeDialog({
            icon: "error",
            title: "Pass not cancelled",
            text: `${body?.message || err?.message || "Failed to cancel the pass."}${
              body?.data?.failedReason ? ` Reason: ${body.data.failedReason}` : ""
            }`,
          });
        }
      } finally {
        setStatusBusy(false);
      }
    },
    [statusBusy]
  );

  // Deletes the booking (pass) made by Send Pass - for one contact (row
  // menu). Works for live and already
  // cancelled bookings; contacts without a booking are skipped by the
  // server. The contact itself stays in the list.
  const handleDeleteBooking = useCallback(
    async (targets) => {
      const withPass = targets;
      if (!withPass.length || statusBusy) return;
      setOpenActionMenuId(null);

      const one = withPass.length === 1;
      const confirmed = await confirmDialog({
        title: `Delete booking: ${one ? withPass[0].fullName : `${withPass.length} contacts`}?`,
        text: "This removes the booking made by Send Pass. Contacts without a booking are skipped.",
        points: [
          { icon: "🎟️", text: "The pass QR stops working at the gate." },
          { icon: "↩️", text: "The seats go back to the ticket stock." },
          { icon: "📲", text: "The contact stays in the list - you can send a new pass later." },
        ],
        confirmText: "Yes, Delete Booking",
        tone: "danger",
      });

      if (!confirmed) return;

      setStatusBusy(true);

      try {
        const res = await deleteContactBookingApi({
          ids: withPass.map((contact) => contact._id),
        });

        if (res?.data?.failed) {
          await noticeDialog({
            icon: res.data.deleted ? "warning" : "error",
            title: res.data.deleted ? "Some bookings were not deleted" : "Booking not deleted",
            text: `${res.message}${res.data.failedReason ? ` Reason: ${res.data.failedReason}` : ""}`,
          });
        } else if (!res?.data?.deleted) {
          await noticeDialog({
            icon: "info",
            title: "Nothing to delete",
            text: res.message,
          });
        } else {
          showSuccess(res.message || "Booking deleted");
        }

        setSelected((prev) => {
          const next = { ...prev };
          withPass.forEach((contact) => delete next[contact._id]);
          return next;
        });
        setRefreshKey((key) => key + 1);
      } catch (err) {
        showError(
          err?.response?.status === 404
            ? "Delete Booking is not available on the server yet - please deploy / restart the backend."
            : err?.response?.data?.message || err?.message || "Failed to delete booking"
        );
      } finally {
        setStatusBusy(false);
      }
    },
    [statusBusy]
  );

  // Re-sends the same pass (same QR link) to a contact who already has one.
  const handleResendPass = useCallback(
    async (contact) => {
      if (resendBusyId) return;

      setOpenActionMenuId(null);
      setResendBusyId(contact._id);

      try {
        const res = await resendContactPassApi({ ids: [contact._id] });
        showSuccess(res.message || "Pass sent again.");
      } catch (err) {
        showError(
          err?.response?.data?.message || err?.message || "Failed to resend pass"
        );
      } finally {
        setResendBusyId(null);
      }
    },
    [resendBusyId]
  );

  const handleOpenPass = useCallback((targets) => {
    setOpenActionMenuId(null);
    setPassContacts(targets);
  }, []);

  const handlePassDone = () => {
    // Refresh so "pass sent" state shows; selection of those contacts is
    // cleared once the admin closes the result dialog.
    setRefreshKey((key) => key + 1);
  };

  const handleClosePass = () => {
    if (passContacts) {
      setSelected((prev) => {
        const next = { ...prev };
        passContacts.forEach((contact) => delete next[contact._id]);
        return next;
      });
    }
    setPassContacts(null);
  };

  // ---------- Filter options ----------

  const categoryFilterOptions = useMemo(
    () =>
      (companyCategories || []).map((category) => ({
        value: category._id,
        label: category.name,
      })),
    [companyCategories]
  );

  // The unique-references API already collapses values case-insensitively
  // across every contact (Karan's "a" and Mahesh's "A" arrive as one
  // entry). This second pass is a defensive guard only — it keeps the
  // dropdown from ever rendering a duplicate <option> (and the duplicate
  // React key that would come with it) if the endpoint is ever served
  // stale/unnormalized data.
  const referenceFilterOptions = useMemo(() => {
    const seen = new Set();

    return (uniqueReferences || []).reduce((options, reference) => {
      if (typeof reference !== "string") return options;

      const trimmed = reference.trim();
      if (!trimmed) return options;

      const key = trimmed.toLowerCase();
      if (seen.has(key)) return options;

      seen.add(key);
      options.push({ value: trimmed, label: trimmed });

      return options;
    }, []);
  }, [uniqueReferences]);

  // Reference options are shown alphabetically, case-insensitively (e.g.
  // "a, b, c, d, h, n, v") regardless of the order the backend returns
  // them in — independent of Contact List's own row sorting above.
const sortedReferenceFilterOptions = useMemo(
  () =>
    [...referenceFilterOptions].sort((a, b) =>
      a.label.toLowerCase().localeCompare(b.label.toLowerCase())
    ),
  [referenceFilterOptions]
);

  // Reference (normalized, case-insensitive) -> every contact name that
  // holds it, e.g. Karan -> [a,b,c,d] and Ramesh -> [a,g,h,p] becomes
  // "a" -> [Karan, Ramesh], "b" -> [Karan], "g" ->  [Ramesh], etc. Built
  // from the same grouped data the (now-removed) Reference Summary
  // section used, so a reference shared by multiple contacts still
  // appears as one combined entry — just shown inline in each of those
  // contacts' own Reference cell below instead of in a separate table.
  const referenceContactsByKey = useMemo(() => {
    const map = new Map();

    (referenceSummary || []).forEach((group) => {
      if (!group || typeof group.reference !== "string") return;

      const key = group.reference.trim().toLowerCase();
      const names = Array.isArray(group.contacts) ? group.contacts : [];

      map.set(key, names);
    });

    return map;
  }, [referenceSummary]);

  // ---------- Columns ----------

  // Builds a clickable header for a server-sortable column. Passed as the
  // column's `label` (with `sortable: false`) so CommonTable's own static
  // sort icon isn't rendered on top of this interactive one — CommonTable
  // itself stays untouched.
  const renderSortableHeader = useCallback(
    (label, field) => (
      <span
        className="contactPage__sortHeader"
        role="button"
        tabIndex={0}
        aria-label={`Sort by ${label}`}
        onClick={() => handleSort(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
      >
        <span
          className={`contactPage__sortIcon ${
            sortBy === field ? "contactPage__sortIconActive" : ""
          }`}
        >
          {sortBy === field ? (
            sortOrder === "asc" ? (
              <FaSortUp />
            ) : (
              <FaSortDown />
            )
          ) : (
            <FaSort />
          )}
        </span>
        {label}
      </span>
    ),
    [sortBy, sortOrder, handleSort]
  );

  const contactTableColumns = useMemo(() => {
    // Only fullName/whatsappNumber/companyName (SORTABLE_COLUMNS) are
    // actually clickable — those keep their own custom header (icon +
    // label, wired to handleSort) and are marked `sortable: false` so
    // CommonTable doesn't stack a second icon on top of that one.
    // Every other column is left at CommonTable's default (sortable
    // left unset), so CommonTable renders its own built-in, static
    // FaSort icon in front of the label — the same "icon before every
    // column" look already used on the Entry Report table, even though
    // clicking it does nothing for these non-sortable columns.
    const sortableColumn = (key, label, extra = {}) => {
      const isSortable = SORTABLE_COLUMNS.includes(key);
      return {
        key,
        label: isSortable ? renderSortableHeader(label, key) : label,
        ...(isSortable ? { sortable: false } : {}),
        ...extra,
      };
    };

    return [
      {
        key: "select",
        sortable: false,
        headerClassName: "contactPage__checkCol",
        cellClassName: "contactPage__checkCol",
        label: (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label="Select all contacts on this page"
            checked={allOnPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = someOnPageSelected;
            }}
            onChange={handleToggleSelectAll}
            disabled={contacts.length === 0}
          />
        ),
        render: (contact) => (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label={`Select ${contact.fullName}`}
            checked={!!selected[contact._id]}
            onChange={() => handleToggleSelect(contact)}
          />
        ),
      },
      sortableColumn("fullName", "Full Name", {
        cellClassName: "contactPage__contactName",
        render: (contact) => (
          <ContactPerson name={contact.fullName} image={contact.profileImage} />
        ),
      }),
      {
        key: "approvalStatus",
        label: "Status",
        sortable: false,
        render: (contact) => {
          const status = getApprovalStatus(contact);
          return (
            <span className="contactPage__statusCell">
              <span
                className={`contactPage__statusBadge contactPage__statusBadge--${status}`}
              >
                {STATUS_LABELS[status]}
              </span>
              {contact.passSentAt && (
                <span
                  className="contactPage__passSentTag"
                  title={`Pass sent on ${new Date(
                    contact.passSentAt
                  ).toLocaleString("en-GB")}`}
                >
                  <FaWhatsapp /> Pass sent
                </span>
              )}
              {status === "rejected" && contact.passCancelledAt && (
                <span
                  className="contactPage__passCancelledTag"
                  title={`Pass cancelled on ${new Date(
                    contact.passCancelledAt
                  ).toLocaleString("en-GB")}`}
                >
                  <FaTimes /> Pass cancelled
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "editionName",
        label: "Edition",
        sortable: false,
        render: (contact) =>
          contact.editionName ? (
            <span className="contactPage__editionTag">{contact.editionName}</span>
          ) : (
            "-"
          ),
      },
      sortableColumn("whatsappNumber", "WhatsApp Number", {
        render: (contact) => contact.whatsappNumber || "-",
      }),
      sortableColumn("companyName", "Company Name", {
        render: (contact) => contact.companyName || "-",
      }),
      sortableColumn("designation", "Designation", {
        render: (contact) => contact.designation || "-",
      }),
      sortableColumn("companyCategory", "Company Category", {
        // Populated by the backend as { _id, name } (see
        // getAllContacts' .populate("companyCategory", "name")), and is
        // legitimately null for contacts with no category assigned.
        // A Couple's spouse profession category (professionCategory) is
        // shown here too, so both categories appear in this column.
        render: (contact) =>
          [
            ...new Set(
              [contact.companyCategory?.name, contact.professionCategory?.name].filter(Boolean)
            ),
          ].join(", ") || "-",
      }),
      sortableColumn("address", "Address", {
        cellClassName: "contactPage__addressCell",
        render: (contact) => contact.address || "-",
      }),
      sortableColumn("area", "Area", {
        render: (contact) => contact.area || "-",
      }),
      sortableColumn("instagramId", "Instagram ID", {
        render: (contact) => <InstagramLink id={contact.instagramId} />,
      }),
      sortableColumn("spouseName", "Spouse Name", {
        render: (contact) => (
          <ContactPerson
            name={contact.spouseName}
            image={contact.spouseProfileImage}
          />
        ),
      }),
      sortableColumn("spouseMobile", "Spouse Mobile Number", {
        render: (contact) => contact.spouseMobile || "-",
      }),
      sortableColumn("spouseInstagramId", "Spouse Instagram ID", {
        render: (contact) => <InstagramLink id={contact.spouseInstagramId} />,
      }),
      sortableColumn("profession", "Profession", {
        render: (contact) => contact.profession || "-",
      }),
      sortableColumn("references", "Reference", {
        render: (contact) => {
          const references = (
            Array.isArray(contact.references)
              ? contact.references.filter(
                  (reference) =>
                    typeof reference === "string" && reference.trim()
                )
              : []
          )
            // Alphabetical, case-insensitive (e.g. a, b, c, d, h, n, v) —
            // this only orders the Reference chips themselves, not the
            // Contact List row sorting above.
            .slice()
            .sort((a, b) =>
              a.trim().toLowerCase().localeCompare(b.trim().toLowerCase())
            );

          if (references.length === 0) return "-";

          return (
            <span className="contactPage__referenceCell">
              {references.map((reference) => {
                // Chip only ever shows the reference name itself now —
                // the "(Name, Name)" suffix that used to list every
                // contact sharing this reference has been dropped per
                // request. referenceContactsByKey / getReferenceSummary
                // are left untouched in case they're needed elsewhere.
                const label = reference;

                return (
                  <span key={reference} className="contactPage__referenceChip">
                    {label}
                  </span>
                );
              })}
            </span>
          );
        },
      }),
      {
        key: "action",
        label: "Actions",
        sortable: false,
        // Sticky on the right edge (see .contactPage__actionCol) so the
        // WhatsApp icon + Action menu are always visible without scrolling.
        headerClassName: "contactPage__actionCol",
        cellClassName: "contactPage__actionCol",
        render: (contact) => (
          <div
            className="contactAction__wrapper"
            ref={openActionMenuId === contact._id ? actionMenuRef : null}
          >
            {getApprovalStatus(contact) === "approved" && !contact.passSentAt && (
              <button
                type="button"
                className="contactAction__whatsapp"
                title="Send pass on WhatsApp"
                aria-label={`Send pass to ${contact.fullName} on WhatsApp`}
                onClick={() => handleOpenPass([contact])}
              >
                <FaWhatsapp />
              </button>
            )}

            <button
              type="button"
              className="contactAction__button"
              onClick={() => handleToggleActionMenu(contact._id)}
            >
              Action
              <FaChevronDown className="contactAction__icon" />
            </button>

            <div
              className={`contactAction__menu ${
                openActionMenuId === contact._id
                  ? "contactAction__menuOpen"
                  : ""
              }`}
            >
              <button
                type="button"
                className="contactAction__item contactAction__itemView"
                onClick={() => handleViewClick(contact)}
              >
                View
              </button>

              {getApprovalStatus(contact) === "approved" && contact.passSentAt && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemApprove"
                  disabled={resendBusyId === contact._id}
                  onClick={() => handleResendPass(contact)}
                >
                  {resendBusyId === contact._id ? "Sending..." : "Resend Pass"}
                </button>
              )}

              {contact.passSentAt && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemReject"
                  onClick={() => handleDeleteBooking([contact])}
                >
                  Delete Booking
                </button>
              )}

              {getApprovalStatus(contact) !== "approved" && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemApprove"
                  onClick={() => handleChangeStatus([contact], "approved")}
                >
                  Approve
                </button>
              )}

              {/* Reject is only for people who are still Pending. After
                  approval the pass is cancelled with "Cancel Pass". */}
              {getApprovalStatus(contact) === "pending" && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemReject"
                  onClick={() => handleChangeStatus([contact], "rejected")}
                >
                  Reject
                </button>
              )}

              {getApprovalStatus(contact) === "approved" && contact.passSentAt && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemReject"
                  onClick={() => handleCancelPass([contact])}
                >
                  Cancel Pass
                </button>
              )}

              {getApprovalStatus(contact) !== "pending" && (
                <button
                  type="button"
                  className="contactAction__item contactAction__itemPending"
                  onClick={() => handleChangeStatus([contact], "pending")}
                >
                  Mark Pending
                </button>
              )}

              <button
                type="button"
                className="contactAction__item contactAction__itemEdit"
                onClick={() => handleEditClick(contact)}
              >
                Edit
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemDelete"
                onClick={() => handleDeleteClick(contact)}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ];
  }, [
    renderSortableHeader,
    openActionMenuId,
    resendBusyId,
    handleResendPass,
    handleToggleActionMenu,
    handleViewClick,
    handleEditClick,
    handleDeleteClick,
    referenceContactsByKey,
    contacts,
    selected,
    allOnPageSelected,
    someOnPageSelected,
    handleToggleSelect,
    handleChangeStatus,
    handleCancelPass,
    handleOpenPass,
  ]);

  return (
    <CommonListLayout
      pageClassName="contactPage__page"
      mainAreaClassName="contactPage__mainArea"
      contentClassName="contactPage__content"
      headerTitle="Guest List"
      outsideMainArea={
        <>
          {isFormModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseFormModal();
                }
              }}
            >
              <CreateContactModal
                onClose={handleCloseFormModal}
                isEditMode={formModalMode === "edit"}
                editContactData={selectedContact}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                search={search}
                sortBy={sortBy}
                sortOrder={sortOrder}
                companyCategoryFilter={categoryFilter}
                referenceFilter={referenceFilter}
                onSaved={() => setRefreshKey((key) => key + 1)}
              />
            </div>
          )}

          {isViewModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseViewModal();
                }
              }}
            >
              <ContactDetailsModal
                contact={viewContact}
                onClose={handleCloseViewModal}
              />
            </div>
          )}

          {isImportOpen && (
            <ImportContactsModal
              onClose={() => setIsImportOpen(false)}
              onSuccess={() => {
                setRefreshKey((key) => key + 1);
                dispatch(getUniqueReferences({}));
                dispatch(getReferenceSummary());
              }}
            />
          )}

          {passContacts && (
            <SendPassModal
              contacts={passContacts}
              defaultEventId={
                passContacts.every(
                  (c) =>
                    c.editionEventId &&
                    c.editionEventId === passContacts[0].editionEventId
                )
                  ? passContacts[0].editionEventId
                  : ""
              }
              onClose={handleClosePass}
              onDone={handlePassDone}
            />
          )}

          {isDeleteOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseDeleteModal();
                }
              }}
            >
              <DeleteUserModal
                userName={deleteContactName}
                entityLabel="contact"
                onClose={handleCloseDeleteModal}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="contactPage__topRow"
        title="Guest List"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Guest List</span>
          </div>
        }
        actions={
          <div className="contactPage__headerActions">
            <button
              type="button"
              className="contactPage__exportButton"
              onClick={() => setIsImportOpen(true)}
            >
              <FaFileCsv />
              Import CSV
            </button>

            <CommonExportButton
              onClick={handleExport}
              loading={exportLoading}
              disabled={exportLoading || total === 0}
              label="Export Guest List"
              className="contactPage__exportButton"
              iconClassName="contactPage__exportIcon"
              iconLoadingClassName="contactPage__exportIcon contactPage__exportIcon--spinning"
            />

            <button
              type="button"
              className="contactPage__createButton"
              onClick={handleCreateClick}
            >
              <FaPlus />
              Create Contact
            </button>
          </div>
        }
      />

      <div className="contactPage__tableCard appCard">
        <div className="contactPage__statusTabs" role="tablist">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.countKey}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={`contactPage__statusTab contactPage__statusTab--${tab.countKey} ${
                statusFilter === tab.value ? "contactPage__statusTabActive" : ""
              }`}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
            >
              {tab.label}
              <span className="contactPage__statusTabCount">
                {statusCounts?.[tab.countKey] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {selectedCount > 0 && (
          <div className="contactPage__bulkBar">
            <span className="contactPage__bulkCount">
              {selectedCount} selected
            </span>

            <div className="contactPage__bulkButtons">
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                disabled={statusBusy}
                onClick={() => handleChangeStatus(selectedContacts, "approved")}
              >
                <FaCheck /> Approve
              </button>
              {selectedRejectable.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                  disabled={statusBusy}
                  title={
                    selectedRejectable.length < selectedCount
                      ? "Only pending contacts can be rejected"
                      : "Reject the selected contacts"
                  }
                  onClick={() => handleChangeStatus(selectedRejectable, "rejected")}
                >
                  <FaTimes /> Reject ({selectedRejectable.length})
                </button>
              )}
              {selectedCancellable.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                  disabled={statusBusy}
                  title="Cancel the pass of the selected approved guests"
                  onClick={() => handleCancelPass(selectedCancellable)}
                >
                  <FaTimes /> Cancel Pass ({selectedCancellable.length})
                </button>
              )}
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--pending"
                disabled={statusBusy}
                onClick={() => handleChangeStatus(selectedContacts, "pending")}
              >
                <FaClock /> Pending
              </button>
              {selectedApproved.length > 0 && (
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--whatsapp"
                  disabled={statusBusy}
                  title={
                    selectedApproved.length < selectedCount
                      ? "Only approved contacts will receive the pass"
                      : "Send pass on WhatsApp"
                  }
                  onClick={() => handleOpenPass(selectedApproved)}
                >
                  <FaWhatsapp /> Send Pass ({selectedApproved.length})
                </button>
              )}
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--clear"
                onClick={clearSelection}
              >
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
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
          />

          <CommonSelect
            className="contactPage__filterSelect"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Company Categories"
            options={categoryFilterOptions}
          />

          <MultiSelect
            value={referenceFilter}
            onChange={(next) => {
              setReferenceFilter(next);
              setCurrentPage(1);
            }}
            placeholder="All References"
            searchPlaceholder="Search reference..."
            loading={uniqueReferencesLoading}
            options={sortedReferenceFilterOptions}
          />

          <CommonSelect
            className="contactPage__filterSelect"
            value={editionFilter}
            onChange={(e) => {
              setEditionFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Editions"
            loading={editionsLoading}
            options={editionOptions.map((e) => ({
              value: e.value,
              label: e.label,
            }))}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={contactTableColumns}
            data={contacts}
            rowKey="_id"
            loading={loading && contacts.length === 0}
            loadingMessage="Loading contacts..."
            error={error}
            errorMessage="Failed to load contacts."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="contactPage__stateWrap"
                textClassName="contactPage__stateText"
                message="No contacts found."
              />
            }
            stateCellClassName="contactPage__stateCell"
            stateCellStyle={{}}
            rowClassName={(contact) =>
              openActionMenuId === contact._id ? "contactPage__rowActive" : ""
            }
            tableClassName="contactPage__table"
            thContentClassName="contactPage__thContent"
            sortIconClassName="contactPage__sortIcon"
          />
        </div>

        {/* pagination */}
        <CommonPagination
          currentPage={currentPage}
          totalPages={resolvedTotalPages}
          rangeStart={total === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={total}
          showControls={total > rowsPerPage}
          onPageSelect={(page) => setCurrentPage(page)}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === resolvedTotalPages}
        />
      </div>
    </CommonListLayout>
  );
}