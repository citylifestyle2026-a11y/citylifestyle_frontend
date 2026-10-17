import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import {
  listInviteGuestsApi,
  importInviteCsvApi,
  sendInviteCardsApi,
  resetStuckInviteApi,
  deleteInviteGuestsApi,
  previewInviteCardApi,
  createInviteGuestApi,
  updateInviteGuestApi,
} from "../services/inviteService";
import { confirmDialog, noticeDialog } from "../utilits/appSwal";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess, showWarning } from "../utilits/toast";
import "../assets/CSS/InviteCards.css";

const SAMPLE_CSV = "name,mobile\nRahul Shah,9876543210\nPooja Patel,9123456780\n";

const TABS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["sending", "Sending"],
  ["sent", "Sent"],
  ["failed", "Failed"],
];

const downloadSample = () => {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "invitation_guests_sample.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export default function InviteCards() {
  const fileRef = useRef(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, sending: 0, sent: 0, failed: 0 });
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  // ----- add / edit modal -----
  // modal: null | { mode: "add" } | { mode: "edit", guest }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm({ name: "", mobile: "" });
    setFormError("");
    setModal({ mode: "add" });
  };

  const openEdit = (guest) => {
    setForm({
      name: guest.name,
      mobile: guest.mobileNumber.replace(/^91(?=\d{10}$)/, ""),
    });
    setFormError("");
    setModal({ mode: "edit", guest });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (saving) return;

    const name = form.name.trim();
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

  // ----- preview -----
  const [previewName, setPreviewName] = useState("Rahul Shah");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const blob = await previewInviteCardApi(previewName.trim() || "Guest Name");
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return objectUrl;
        });
      } catch {
        if (!cancelled) setPreviewUrl("");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [previewName]);

  // ----- list -----
  const load = useCallback(async () => {
    try {
      const res = await listInviteGuestsApi({
        page,
        limit,
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
      });
      setItems(res.data.items);
      setTotal(res.data.total);
      setCounts(res.data.counts);
    } catch (err) {
      showError(getErrorText(err, "Failed to load guests"));
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  // While invitations are being sent, keep refreshing.
  useEffect(() => {
    if (!counts.sending) return undefined;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [counts.sending, load]);

  // ----- actions -----
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

      setPage(1);
      load();
    } catch (err) {
      showError(getErrorText(err, "Failed to import CSV"));
    } finally {
      setBusy(false);
    }
  };

  const doSend = async (body, label) => {
    const ok = await confirmDialog({
      title: label,
      text: "The invitation card (with the guest's name on it) will be sent on WhatsApp.",
      points: [
        { icon: "🖼️", text: "Same design for everyone, only the name changes." },
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
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const handleDelete = async (ids) => {
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
  };

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

  const allOnPage = items.length > 0 && items.every((g) => selected[g._id]);
  const toggleAll = () =>
    setSelected((prev) => {
      const next = { ...prev };
      items.forEach((g) => (next[g._id] = !allOnPage));
      return next;
    });

  const pages = Math.max(1, Math.ceil(total / limit));
  const sendable = counts.pending + counts.failed;

  return (
    <CommonListLayout headerTitle="Invitation Cards">
      <CommonPageHeader
        title="Invitation Cards"
        breadcrumb={
          <p style={{ margin: "4px 0 20px", color: "#7b7f93", fontSize: 14 }}>
            <Link to="/dashboard">Dashboard</Link> - Invitation Cards
          </p>
        }
      />

      <div className="inviteCards__top">
        <div className="inviteCards__panel">
          <h3 className="inviteCards__panelTitle">Card preview</h3>
          <input
            className="inviteCards__nameInput"
            value={previewName}
            maxLength={60}
            onChange={(e) => setPreviewName(e.target.value)}
            placeholder="Type a name to preview"
          />
          <div className="inviteCards__previewBox">
            {previewUrl ? <img src={previewUrl} alt="Invitation card preview" /> : previewLoading ? "Loading..." : "No preview"}
          </div>
        </div>

        <div className="inviteCards__right">
          <div className="inviteCards__panel">
            <h3 className="inviteCards__panelTitle">Send invitations</h3>
            <div className="inviteCards__actions">
              <button
                className="inviteCards__btn inviteCards__btnPrimary"
                disabled={busy || !sendable || counts.sending > 0}
                onClick={() => doSend({ all: true }, `Send to all ${sendable} pending / failed guests?`)}
              >
                Send to all ({sendable})
              </button>
              <button
                className="inviteCards__btn"
                disabled={busy || !selectedIds.length || counts.sending > 0}
                onClick={() =>
                  doSend({ ids: selectedIds, includeSent: true }, `Send to ${selectedIds.length} selected guest(s)?`)
                }
              >
                Send selected ({selectedIds.length})
              </button>
              <button className="inviteCards__btn" onClick={openAdd}>
                + Add guest
              </button>
              <button className="inviteCards__btn" disabled={busy} onClick={() => fileRef.current?.click()}>
                Import CSV
              </button>
              <button className="inviteCards__btn" onClick={downloadSample}>
                Sample CSV
              </button>
              {counts.sending > 0 && (
                <button className="inviteCards__btn inviteCards__btnDanger" onClick={handleReset}>
                  Reset stuck
                </button>
              )}
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile} />
            </div>
            <p className="inviteCards__hint">
              CSV needs a header row with <b>name</b> and <b>mobile</b>. Mobile can be 10 digits, or with 91.
              "Send to all" skips guests who already received the card. "Send selected" can re-send to anyone.
            </p>
          </div>

          <div className="inviteCards__panel">
            <div className="inviteCards__stats">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  className={`inviteCards__stat ${status === key ? "inviteCards__statActive" : ""}`}
                  onClick={() => {
                    setStatus(key);
                    setPage(1);
                  }}
                >
                  {label}
                  <b>{counts[key] ?? 0}</b>
                </button>
              ))}
            </div>
            <input
              className="inviteCards__nameInput"
              style={{ marginBottom: 0, maxWidth: 320 }}
              value={search}
              placeholder="Search name or number"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="inviteCards__panel">
        {selectedIds.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button className="inviteCards__btn inviteCards__btnDanger" onClick={() => handleDelete(selectedIds)}>
              Delete selected ({selectedIds.length})
            </button>
          </div>
        )}

        <div className="inviteCards__tableWrap">
          <table className="inviteCards__table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allOnPage} onChange={toggleAll} /></th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Sent at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="inviteCards__empty">No guests yet. Import a CSV to begin.</div>
                  </td>
                </tr>
              )}
              {items.map((g) => (
                <tr key={g._id}>
                  <td>
                    <input type="checkbox" checked={!!selected[g._id]} onChange={() => setSelected((p) => ({ ...p, [g._id]: !p[g._id] }))} />
                  </td>
                  <td>{g.name}</td>
                  <td>{g.mobileNumber.replace(/^91(?=\d{10}$)/, "")}</td>
                  <td>
                    <span className={`inviteCards__badge inviteCards__badge--${g.status}`}>{g.status}</span>
                    {g.status === "failed" && g.error && <span className="inviteCards__error">{g.error}</span>}
                  </td>
                  <td>{g.sentAt ? new Date(g.sentAt).toLocaleString("en-GB") : "-"}</td>
                  <td>
                    <button
                      className="inviteCards__rowBtn"
                      disabled={busy || g.status === "sending" || counts.sending > 0}
                      onClick={() => doSend({ ids: [g._id], includeSent: true }, `${g.status === "sent" ? "Re-send" : "Send"} to ${g.name}?`)}
                    >
                      {g.status === "sent" ? "Resend" : g.status === "failed" ? "Retry" : "Send"}
                    </button>
                    <button
                      className="inviteCards__rowBtn"
                      disabled={g.status === "sending"}
                      onClick={() => openEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      className="inviteCards__rowBtn inviteCards__rowBtnDanger"
                      disabled={g.status === "sending"}
                      onClick={() => handleDelete([g._id])}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="inviteCards__pager">
          <span>
            Show {total ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} of {total}
          </span>
          <span>
            <button className="inviteCards__rowBtn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            {page} / {pages}
            <button className="inviteCards__rowBtn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </span>
        </div>
      </div>

      {modal && (
        <div className="inviteCards__overlay" onMouseDown={closeModal}>
          <form
            className="inviteCards__modal"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={submitForm}
          >
            <h3 className="inviteCards__panelTitle">
              {modal.mode === "edit" ? "Edit guest" : "Add guest"}
            </h3>

            <label className="inviteCards__label">Name</label>
            <input
              className="inviteCards__nameInput"
              value={form.name}
              maxLength={60}
              autoFocus
              placeholder="Guest name (printed on the card)"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />

            <label className="inviteCards__label">WhatsApp number</label>
            <input
              className="inviteCards__nameInput"
              value={form.mobile}
              inputMode="numeric"
              placeholder="10-digit mobile number"
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            />

            {modal.mode === "edit" && (
              <p className="inviteCards__hint" style={{ marginTop: 0 }}>
                Changing the number makes this guest Pending again, so the card goes to the new number.
              </p>
            )}

            {formError && <p className="inviteCards__formError">{formError}</p>}

            <div className="inviteCards__actions" style={{ marginTop: 8 }}>
              <button type="submit" className="inviteCards__btn inviteCards__btnPrimary" disabled={saving}>
                {saving ? "Saving..." : modal.mode === "edit" ? "Save" : "Add"}
              </button>
              <button type="button" className="inviteCards__btn" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </CommonListLayout>
  );
}
