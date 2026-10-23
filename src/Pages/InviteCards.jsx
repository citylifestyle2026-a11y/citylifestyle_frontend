import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaUserPlus,
  FaFileCsv,
  FaImage,
  FaChevronDown,
  FaFileExcel,
  FaPaperPlane,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";

import {
  listInviteGuestsApi,
  importInviteCsvApi,
  sendInviteCardsApi,
  resetStuckInviteApi,
  deleteInviteGuestsApi,
  previewInviteCardApi,
  getInviteDesignApi,
  uploadInviteDesignApi,
  saveInviteNameStyleApi,
  removeInviteDesignApi,
  createInviteGuestApi,
  updateInviteGuestApi,
} from "../services/inviteService";
import { confirmDialog, noticeDialog } from "../utilits/appSwal";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess, showWarning } from "../utilits/toast";

// Same look as Contact Book / Guest List (table, tabs, bulk bar, Action menu,
// empty state) + the popup used by Form Links.
import "../assets/CSS/ContactList.css";
import "../assets/CSS/CreateCompanyCategoryModal.css";
import "../assets/CSS/InviteCards.css";
import { saveCsvText } from "../utilits/download";
import useClickOutside from "../hooks/useClickOutside";
import { formatDateTime } from "../utilits/dateFormat";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));

const SAMPLE_CSV = "name,mobile\nRahul Shah,9876543210\nPooja Patel,9123456780\n";

const DEFAULT_STYLE = { topPct: 48, centerXPct: 50, fontSizePct: 5.2, color: "#C9A24B" };
const MAX_DESIGN_MB = 15;
const DESIGN_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

const TABS = [
  { value: "all", label: "All", tone: "all" },
  { value: "pending", label: "Pending", tone: "pending" },
  { value: "sending", label: "Sending", tone: "sending" },
  { value: "sent", label: "Sent", tone: "approved" },
  { value: "failed", label: "Failed", tone: "rejected" },
];

const STATUS_BADGE = {
  pending: { tone: "pending", label: "Pending" },
  sending: { tone: "pending", label: "Sending" },
  sent: { tone: "approved", label: "Sent" },
  failed: { tone: "rejected", label: "Failed" },
};

const downloadSample = () => saveCsvText(SAMPLE_CSV, "invitation_guests_sample.csv");

const shortMobile = (value) => String(value || "").replace(/^91(?=\d{10}$)/, "");

export default function InviteCards() {
  const csvRef = useRef(null);
  const designRef = useRef(null);
  const actionMenuRef = useRef(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, sending: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [status, setStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // ----- add / edit guest popup -----
  // modal: null | { mode: "add" } | { mode: "edit", guest }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // ----- card design -----
  const [design, setDesign] = useState(null); // { hasDesign, width, height, originalName, updatedAt }
  const [designBusy, setDesignBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Where the guest's name is written on the card (saved per design).
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [savedStyle, setSavedStyle] = useState(DEFAULT_STYLE);
  const [savingStyle, setSavingStyle] = useState(false);

  const applyDesign = useCallback((info) => {
    setDesign(info);
    const next = { ...DEFAULT_STYLE, ...(info?.nameStyle || {}) };
    setStyle(next);
    setSavedStyle(next);
  }, []);
  const styleChanged = JSON.stringify(style) !== JSON.stringify(savedStyle);
  const [previewName, setPreviewName] = useState("Rahul Shah");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + items.length, total);
  const sendable = counts.pending + counts.failed;
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCount = selectedIds.length;

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ---------- list ----------
  const load = useCallback(async () => {
    try {
      const res = await listInviteGuestsApi({
        page: currentPage,
        limit: rowsPerPage,
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
      });
      setItems(res.data.items);
      setTotal(res.data.total);
      setCounts(res.data.counts);
      setListError(false);
    } catch (err) {
      setListError(true);
      showError(getErrorText(err, "Failed to load guests"));
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  // While invitations are being sent, keep refreshing.
  useEffect(() => {
    if (!counts.sending) return undefined;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [counts.sending, load]);

  // Close the Action dropdown on an outside click.
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  // ---------- design ----------
  useEffect(() => {
    getInviteDesignApi()
      .then((res) => applyDesign(res.data))
      .catch(() => {});
  }, []);

  const handleDesignFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ext = `.${file.name.split(".").pop().toLowerCase()}`;
    if (!DESIGN_EXTS.includes(ext)) {
      showError("Please choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_DESIGN_MB * 1024 * 1024) {
      showError(`The image is too large (max ${MAX_DESIGN_MB} MB).`);
      return;
    }

    setDesignBusy(true);
    try {
      const res = await uploadInviteDesignApi(file);
      applyDesign(res.data);
      showSuccess(res.message);
      setPreviewOpen(true);
    } catch (err) {
      showError(getErrorText(err, "Failed to upload the design"));
    } finally {
      setDesignBusy(false);
    }
  };

  const handleRemoveDesign = async () => {
    const ok = await confirmDialog({
      title: "Remove the invitation card design?",
      text: "The default card will be used until you upload a new design.",
      confirmText: "Yes, remove",
      tone: "danger",
    });
    if (!ok) return;

    setDesignBusy(true);
    try {
      const res = await removeInviteDesignApi();
      applyDesign(res.data);
      showSuccess(res.message);
    } catch (err) {
      showError(getErrorText(err, "Failed to remove the design"));
    } finally {
      setDesignBusy(false);
    }
  };

  // Preview popup: the card with the typed name on it.
  useEffect(() => {
    if (!previewOpen) return undefined;
    let cancelled = false;

    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const blob = await previewInviteCardApi(previewName.trim() || "Guest Name", style);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return objectUrl;
        });
      } catch {
        if (!cancelled) setPreviewUrl("");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [previewOpen, previewName, style, design?.updatedAt, design?.hasDesign]);

  // Click on the card = "write the name here".
  const placeNameOnCard = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    // The click marks the CENTRE of the name; the server wants its top edge.
    const W = design?.width || 1080;
    const H = design?.height || 1350;
    const halfHeightPct = ((style.fontSizePct / 100) * W * 1.5 * 0.5 / H) * 100;

    setStyle((prev) => ({
      ...prev,
      centerXPct: Math.round(Math.min(100, Math.max(0, xPct)) * 10) / 10,
      topPct: Math.round(Math.min(95, Math.max(0, yPct - halfHeightPct)) * 10) / 10,
    }));
  };

  const handleSaveStyle = async () => {
    setSavingStyle(true);
    try {
      const res = await saveInviteNameStyleApi(style);
      applyDesign(res.data); // also makes the saved position the current one
      showSuccess(res.message);
      setPreviewOpen(false); // saved -> close the popup
    } catch (err) {
      showError(getErrorText(err, "Failed to save the name position"));
    } finally {
      setSavingStyle(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setStyle(savedStyle); // forget anything that was not saved
  };

  // ---------- guest popup ----------
  const openAdd = () => {
    setForm({ name: "", mobile: "" });
    setFormError("");
    setModal({ mode: "add" });
  };

  const openEdit = useCallback((guest) => {
    setOpenActionMenuId(null);
    setForm({ name: guest.name, mobile: shortMobile(guest.mobileNumber) });
    setFormError("");
    setModal({ mode: "edit", guest });
  }, []);

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (saving) return;

    const name = form.name.replace(/\s+/g, " ").trim();
    const digits = form.mobile.replace(/\D/g, "");
    if (!name) return setFormError("Name is required.");
    if (!/^(91)?[6-9]\d{9}$/.test(digits)) {
      return setFormError("Enter a valid 10-digit mobile number.");
    }

    setSaving(true);
    setFormError("");
    try {
      const res =
        modal.mode === "edit"
          ? await updateInviteGuestApi(modal.guest._id, { name, mobile: digits })
          : await createInviteGuestApi({ name, mobile: digits });
      showSuccess(res.message);
      setModal(null);
      load();
    } catch (err) {
      setFormError(getErrorText(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  // ---------- actions ----------
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const res = await importInviteCsvApi(file);
      const d = res.data;

      if (d.invalid || d.alreadyAdded) {
        const lines = d.errors.slice(0, 8).map((x) => `Row ${x.line}: ${x.message}`);
        await noticeDialog({
          icon: d.imported ? "warning" : "error",
          title: `${d.imported} imported`,
          text: [
            d.alreadyAdded ? `${d.alreadyAdded} already in the list (skipped).` : "",
            d.invalid ? `${d.invalid} rows have problems:` : "",
            ...lines,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } else {
        showSuccess(res.message);
      }

      setCurrentPage(1);
      load();
    } catch (err) {
      showError(getErrorText(err, "Failed to import CSV"));
    } finally {
      setBusy(false);
    }
  };

  const doSend = useCallback(
    async (body, label) => {
      setOpenActionMenuId(null);

      if (!design?.hasDesign) {
        await noticeDialog({
          icon: "warning",
          title: "Upload the card design first",
          text: 'Please upload your invitation card image (JPG or PNG) using "Upload Card Design", then send the invitations.',
        });
        return;
      }

      const ok = await confirmDialog({
        title: label,
        text: "Your invitation card (JPG) with the guest's name on it will be sent on WhatsApp.",
        points: [
          { icon: "🖼️", text: "The card you uploaded is used for everyone, only the name changes." },
          { icon: "📲", text: "Sending runs in the background - you can keep this page open." },
        ],
        confirmText: "Yes, send",
        tone: "info",
      });
      if (!ok) return;

      setBusy(true);
      try {
        const res = await sendInviteCardsApi(body);
        showSuccess(res.message);
        setSelected({});
        load();
      } catch (err) {
        showError(getErrorText(err, "Failed to start sending"));
      } finally {
        setBusy(false);
      }
    },
    [design?.hasDesign, load]
  );

  const handleDelete = useCallback(
    async (ids) => {
      setOpenActionMenuId(null);
      const ok = await confirmDialog({
        title: `Delete ${ids.length} guest${ids.length === 1 ? "" : "s"}?`,
        text: "They are removed from this list only.",
        confirmText: "Yes, delete",
        tone: "danger",
      });
      if (!ok) return;

      try {
        const res = await deleteInviteGuestsApi(ids);
        showSuccess(res.message);
        setSelected({});
        load();
      } catch (err) {
        showError(getErrorText(err, "Failed to delete"));
      }
    },
    [load]
  );

  const handleReset = async () => {
    try {
      const res = await resetStuckInviteApi();
      if (res.data.reset) showWarning(`${res.data.reset} guests moved back to Pending.`);
      else showSuccess("Nothing is stuck.");
      load();
    } catch (err) {
      showError(getErrorText(err));
    }
  };

  // ---------- selection ----------
  const allOnPageSelected = items.length > 0 && items.every((g) => selected[g._id]);
  const someOnPageSelected = !allOnPageSelected && items.some((g) => selected[g._id]);

  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = { ...prev };
      items.forEach((g) => {
        next[g._id] = !allOnPageSelected;
      });
      return next;
    });

  const toggleOne = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  // ---------- table ----------
  const columns = useMemo(
    () => [
      {
        key: "select",
        sortable: false,
        headerClassName: "contactPage__checkCol",
        cellClassName: "contactPage__checkCol",
        label: (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label="Select all guests on this page"
            checked={allOnPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = someOnPageSelected;
            }}
            onChange={toggleAllOnPage}
            disabled={items.length === 0}
          />
        ),
        render: (g) => (
          <input
            type="checkbox"
            className="contactPage__checkbox"
            aria-label={`Select ${g.name}`}
            checked={!!selected[g._id]}
            onChange={() => toggleOne(g._id)}
          />
        ),
      },
      {
        key: "name",
        label: "Full Name",
        sortable: false,
        cellClassName: "contactPage__contactName",
        render: (g) => g.name,
      },
      { key: "mobile", label: "Mobile", sortable: false, render: (g) => shortMobile(g.mobileNumber) },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (g) => {
          const badge = STATUS_BADGE[g.status] || STATUS_BADGE.pending;
          return (
            <>
              <span className={`contactPage__statusBadge contactPage__statusBadge--${badge.tone}`}>
                {badge.label}
              </span>
              {g.status === "failed" && g.error && <span className="inviteCards__error">{g.error}</span>}
            </>
          );
        },
      },
      {
        key: "sentAt",
        label: "Sent At",
        sortable: false,
        render: (g) => formatDateTime(g.sentAt),
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        headerClassName: "contactPage__actionCol",
        cellClassName: "contactPage__actionCol",
        render: (g) => (
          <div className="contactAction__wrapper" ref={openActionMenuId === g._id ? actionMenuRef : null}>
            <button
              type="button"
              className="contactAction__button"
              onClick={() => setOpenActionMenuId((prev) => (prev === g._id ? null : g._id))}
            >
              Action
              <FaChevronDown className="contactAction__icon" />
            </button>

            <div className={`contactAction__menu ${openActionMenuId === g._id ? "contactAction__menuOpen" : ""}`}>
              <button
                type="button"
                className="contactAction__item contactAction__itemApprove"
                disabled={busy || g.status === "sending" || counts.sending > 0}
                onClick={() =>
                  doSend(
                    { ids: [g._id], includeSent: true },
                    `${g.status === "sent" ? "Re-send" : "Send"} to ${g.name}?`
                  )
                }
              >
                {g.status === "sent" ? "Resend" : g.status === "failed" ? "Retry" : "Send"}
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemEdit"
                disabled={g.status === "sending"}
                onClick={() => openEdit(g)}
              >
                Edit
              </button>

              <button
                type="button"
                className="contactAction__item contactAction__itemDelete"
                disabled={g.status === "sending"}
                onClick={() => handleDelete([g._id])}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, selected, allOnPageSelected, someOnPageSelected, openActionMenuId, busy, counts.sending, doSend, openEdit, handleDelete]
  );

  return (
    <CommonListLayout
      pageClassName="contactPage__page"
      mainAreaClassName="contactPage__mainArea"
      contentClassName="contactPage__content"
      headerTitle="Invitation Cards"
      outsideMainArea={
        <>
          {modal && (
            <div className="companyCategoryModalOverlay" onClick={closeModal}>
              <form
                className="createCompanyCategoryModal"
                onClick={(e) => e.stopPropagation()}
                onSubmit={submitForm}
                noValidate
              >
                <div className="modalHeader">
                  <h2 className="modalTitle">{modal.mode === "edit" ? "Edit Guest" : "Add Guest"}</h2>
                  <button type="button" className="closeIconButton" onClick={closeModal} aria-label="Close modal">
                    <FaTimes />
                  </button>
                </div>

                <div className="formGrid">
                  <div className="fieldGroup fieldGroupFull">
                    <label className="fieldLabel" htmlFor="icName">
                      Name <span className="required">*</span>
                    </label>
                    <input
                      id="icName"
                      type="text"
                      className="fieldInput"
                      placeholder="Guest name (printed on the card)"
                      maxLength={60}
                      value={form.name}
                      autoFocus
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="fieldGroup fieldGroupFull">
                    <label className="fieldLabel" htmlFor="icMobile">
                      WhatsApp Number <span className="required">*</span>
                    </label>
                    <input
                      id="icMobile"
                      type="text"
                      inputMode="numeric"
                      className="fieldInput"
                      placeholder="10-digit mobile number"
                      value={form.mobile}
                      onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    />
                    {modal.mode === "edit" && (
                      <p className="inviteCards__note">
                        Changing the number makes this guest Pending again, so the card goes to the new number.
                      </p>
                    )}
                    {formError && <p className="fieldError">{formError}</p>}
                  </div>
                </div>

                <div className="modalFooter">
                  <button type="button" className="modalCloseButton" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="modalCreateButton" disabled={saving}>
                    {saving ? "Saving..." : modal.mode === "edit" ? "Save" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {previewOpen && (
            <div className="companyCategoryModalOverlay" onClick={closePreview}>
              <div
                className="createCompanyCategoryModal inviteCards__previewModal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modalHeader">
                  <h2 className="modalTitle">Card Preview &amp; Name Position</h2>
                  <button
                    type="button"
                    className="closeIconButton"
                    onClick={closePreview}
                    aria-label="Close modal"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="fieldGroup fieldGroupFull">
                  <label className="fieldLabel" htmlFor="icPreviewName">
                    Type a name to preview
                  </label>
                  <input
                    id="icPreviewName"
                    type="text"
                    className="fieldInput"
                    maxLength={60}
                    value={previewName}
                    onChange={(e) => setPreviewName(e.target.value)}
                    placeholder="e.g. Rahul Shah"
                  />
                </div>

                <p className="inviteCards__note">
                  Click on the card where the guest&apos;s name should appear.
                </p>

                <div className="inviteCards__previewBox">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Invitation card preview"
                      className="inviteCards__previewImg"
                      onClick={placeNameOnCard}
                      draggable={false}
                    />
                  ) : previewLoading ? (
                    "Loading..."
                  ) : (
                    "No preview"
                  )}
                </div>

                <div className="inviteCards__styleRow">
                  <label htmlFor="icSize">Text size</label>
                  <input
                    id="icSize"
                    type="range"
                    min="1.5"
                    max="12"
                    step="0.1"
                    value={style.fontSizePct}
                    onChange={(e) => setStyle((p) => ({ ...p, fontSizePct: Number(e.target.value) }))}
                  />
                  <label htmlFor="icColor">Colour</label>
                  <input
                    id="icColor"
                    type="color"
                    value={style.color}
                    onChange={(e) => setStyle((p) => ({ ...p, color: e.target.value }))}
                  />
                </div>

                <div className="modalFooter">
                  <button
                    type="button"
                    className="modalCloseButton"
                    disabled={savingStyle}
                    onClick={() => setStyle({ ...DEFAULT_STYLE })}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="modalCreateButton"
                    disabled={savingStyle || !styleChanged}
                    onClick={handleSaveStyle}
                  >
                    {savingStyle ? "Saving..." : "Save position"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="contactPage__topRow"
        title="Invitation Cards"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Invitation Cards</span>
          </div>
        }
        actions={
          <div className="contactPage__headerActions">
            <button
              type="button"
              className="contactPage__createButton"
              disabled={designBusy}
              onClick={() => designRef.current?.click()}
            >
              <FaImage />
              {designBusy ? "Please wait..." : design?.hasDesign ? "Change Card Design" : "Upload Card Design"}
            </button>

            <button type="button" className="contactPage__createButton" onClick={openAdd}>
              <FaUserPlus />
              Add Guest
            </button>

            <button
              type="button"
              className="contactPage__createButton"
              disabled={busy}
              onClick={() => csvRef.current?.click()}
            >
              <FaFileExcel />
              Import CSV
            </button>

            <button type="button" className="contactPage__createButton" onClick={downloadSample}>
              <FaFileCsv />
              Sample CSV
            </button>

            <input
              ref={designRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              hidden
              onChange={handleDesignFile}
            />
            <input ref={csvRef} type="file" accept=".csv" hidden onChange={handleFile} />
          </div>
        }
      />

      <div className="contactPage__tableCard appCard">
        <div className="inviteCards__designStrip">
          <span className="inviteCards__designText">
            {design?.hasDesign
              ? `Card design: ${design.originalName || "uploaded image"} (${design.width} x ${design.height}px)`
              : "No card design uploaded yet. Click Upload Card Design and choose your invitation card (JPG / PNG, max 15 MB)."}
          </span>
          <span className="inviteCards__designLinks">
            <button type="button" className="inviteCards__linkBtn" onClick={() => setPreviewOpen(true)}>
              Preview &amp; name position
            </button>
            {design?.hasDesign && (
              <button
                type="button"
                className="inviteCards__linkBtn inviteCards__linkBtn--danger"
                disabled={designBusy}
                onClick={handleRemoveDesign}
              >
                Remove
              </button>
            )}
          </span>
        </div>

        <div className="contactPage__statusTabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={`contactPage__statusTab contactPage__statusTab--${tab.tone} ${
                status === tab.value ? "contactPage__statusTabActive" : ""
              }`}
              onClick={() => {
                setStatus(tab.value);
                setSelected({});
                setCurrentPage(1);
              }}
            >
              {tab.label}
              <span className="contactPage__statusTabCount">{counts[tab.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="contactPage__bulkBar">
          <span className="contactPage__bulkCount">
            {selectedCount > 0
              ? `${selectedCount} selected`
              : `${sendable} guest${sendable === 1 ? "" : "s"} ready to send`}
          </span>

          <div className="contactPage__bulkButtons">
            <button
              type="button"
              className="contactPage__bulkBtn contactPage__bulkBtn--approve"
              disabled={busy || !sendable || counts.sending > 0}
              onClick={() => doSend({ all: true }, `Send to all ${sendable} pending / failed guests?`)}
            >
              <FaPaperPlane /> Send to all ({sendable})
            </button>

            {selectedCount > 0 && (
              <>
                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--approve"
                  disabled={busy || counts.sending > 0}
                  onClick={() =>
                    doSend({ ids: selectedIds, includeSent: true }, `Send to ${selectedCount} selected guest(s)?`)
                  }
                >
                  <FaPaperPlane /> Send selected ({selectedCount})
                </button>

                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--reject"
                  onClick={() => handleDelete(selectedIds)}
                >
                  <FaTrash /> Delete selected ({selectedCount})
                </button>

                <button
                  type="button"
                  className="contactPage__bulkBtn contactPage__bulkBtn--clear"
                  onClick={() => setSelected({})}
                >
                  Clear
                </button>
              </>
            )}

            {counts.sending > 0 && (
              <button
                type="button"
                className="contactPage__bulkBtn contactPage__bulkBtn--pending"
                onClick={handleReset}
              >
                Reset stuck
              </button>
            )}
          </div>
        </div>

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
            placeholder="Search name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </div>

        <div className="contactPage__tableWrapper">
          <CommonTable
            columns={columns}
            data={items}
            rowKey="_id"
            loading={loading && items.length === 0}
            loadingMessage="Loading guests..."
            error={listError}
            errorMessage="Failed to load guests."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="contactPage__stateWrap"
                textClassName="contactPage__stateText"
                message="No guests found. Use Add Guest or Import CSV to add guests."
              />
            }
            stateCellClassName="contactPage__stateCell"
            stateCellStyle={{}}
            rowClassName={(g) => (openActionMenuId === g._id ? "contactPage__rowActive" : "")}
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