import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaImage, FaTimes } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import {
  getGuestDesignApi,
  uploadGuestDesignApi,
  saveGuestNameStyleApi,
  saveGuestPhotoBoxApi,
  removeGuestDesignApi,
  getGuestDesignImageApi,
} from "../services/guestCardDesignService";
import { confirmDialog } from "../utilits/appSwal";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
import { copyText } from "../utilits/copyText";

import "../assets/CSS/ContactList.css";
import "../assets/CSS/InviteCards.css";
import "../assets/CSS/GuestCard.css"; // .gc-card / .gc-name / .gc-photo = same look as the guest page

const MAX_DESIGN_MB = 15;
const DESIGN_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const DEFAULT_STYLE = { topPct: 43.8, centerXPct: 50, fontSizePct: 5.1, color: "#6E0A0E" };
const DEFAULT_PHOTO_BOX = { xPct: 33.33, yPct: 21.25, wPct: 33.33, hPct: 18.75, shape: "circle" };

const nameScale = (name) => {
  const len = Array.from(name.trim()).length;
  if (!len) return 1;
  return Math.min(1.15, Math.max(0.65, Math.sqrt(15 / len)));
};
const round1 = (n) => Math.round(n * 10) / 10;

// ADMIN page: the design of the guest card link (guests add their own photo + name).
// Completely separate from "Invitation Cards" (WhatsApp cards with only the name).
export default function GuestCardDesign() {
  const fileRef = useRef(null);
  const [design, setDesign] = useState(null); // { hasDesign, width, height, originalName, updatedAt }
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [savedStyle, setSavedStyle] = useState(DEFAULT_STYLE);
  const [photoBox, setPhotoBox] = useState(DEFAULT_PHOTO_BOX);
  const [savedPhotoBox, setSavedPhotoBox] = useState(DEFAULT_PHOTO_BOX);
  const [placeMode, setPlaceMode] = useState("photo"); // "photo" | "name"
  const [previewName, setPreviewName] = useState("Rahul Shah");
  const [saving, setSaving] = useState(false);
  const [sampleUrl, setSampleUrl] = useState(""); // a test photo, only for this preview (never saved)
  const sampleRef = useRef(null);

  const guestCardLink = `${window.location.origin}/guest-card`;

  const applyDesign = useCallback((info) => {
    setDesign(info);
    const s = { ...DEFAULT_STYLE, ...(info?.nameStyle || {}) };
    const b = { ...DEFAULT_PHOTO_BOX, ...(info?.photoBox || {}) };
    setStyle(s);
    setSavedStyle(s);
    setPhotoBox(b);
    setSavedPhotoBox(b);
  }, []);

  useEffect(() => {
    getGuestDesignApi()
      .then((res) => applyDesign(res.data))
      .catch(() => setDesign({ hasDesign: false }));
  }, [applyDesign]);

  // Load the blank card picture whenever the design changes.
  useEffect(() => {
    if (!design?.hasDesign) {
      setImageUrl("");
      return undefined;
    }
    let url = "";
    let cancelled = false;
    getGuestDesignImageApi()
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch(() => setImageUrl(""));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [design?.hasDesign, design?.updatedAt]);

  const nameChanged = JSON.stringify(style) !== JSON.stringify(savedStyle);
  const photoChanged = JSON.stringify(photoBox) !== JSON.stringify(savedPhotoBox);
  const changed = nameChanged || photoChanged;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = `.${file.name.split(".").pop().toLowerCase()}`;
    if (!DESIGN_EXTS.includes(ext)) return showError("Please choose a JPG, PNG or WEBP image.");
    if (file.size > MAX_DESIGN_MB * 1024 * 1024) return showError(`The image is too large (max ${MAX_DESIGN_MB} MB).`);

    setBusy(true);
    try {
      const res = await uploadGuestDesignApi(file);
      applyDesign(res.data);
      showSuccess(res.message);
    } catch (err) {
      showError(getErrorText(err, "Failed to upload the design"));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => sampleUrl && URL.revokeObjectURL(sampleUrl), [sampleUrl]);

  const handleSample = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = `.${file.name.split(".").pop().toLowerCase()}`;
    if (!DESIGN_EXTS.includes(ext)) return showError("Please choose a JPG, PNG or WEBP photo.");
    setSampleUrl(URL.createObjectURL(file));
  };

  // Arrow buttons: move the photo / name a little (0.5% of the card) for exact placing.
  const nudge = (dx, dy) => {
    if (placeMode === "photo") {
      setPhotoBox((p) => ({
        ...p,
        xPct: round1(Math.min(100 - p.wPct, Math.max(0, p.xPct + dx))),
        yPct: round1(Math.min(100 - p.hPct, Math.max(0, p.yPct + dy))),
      }));
    } else {
      setStyle((p) => ({
        ...p,
        centerXPct: round1(Math.min(100, Math.max(0, p.centerXPct + dx))),
        topPct: round1(Math.min(95, Math.max(0, p.topPct + dy))),
      }));
    }
  };

  const handleRemove = async () => {
    const ok = await confirmDialog({
      title: "Remove the guest card design?",
      text: "The guest card link will show \"not ready\" until you upload a design again.",
      confirmText: "Yes, remove",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await removeGuestDesignApi();
      applyDesign(res.data);
      showSuccess(res.message);
    } catch (err) {
      showError(getErrorText(err, "Failed to remove the design"));
    } finally {
      setBusy(false);
    }
  };

  // Click on the card = "put the photo / name here" (the click is the CENTRE).
  const placeOnCard = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (placeMode === "photo") {
      setPhotoBox((p) => ({
        ...p,
        xPct: round1(Math.min(100 - p.wPct, Math.max(0, xPct - p.wPct / 2))),
        yPct: round1(Math.min(100 - p.hPct, Math.max(0, yPct - p.hPct / 2))),
      }));
      return;
    }
    const W = design?.width || 900;
    const H = design?.height || 1600;
    const halfHeightPct = (((style.fontSizePct / 100) * W * 1.5 * 0.5) / H) * 100;
    setStyle((p) => ({
      ...p,
      centerXPct: round1(Math.min(100, Math.max(0, xPct))),
      topPct: round1(Math.min(95, Math.max(0, yPct - halfHeightPct))),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      if (nameChanged) res = await saveGuestNameStyleApi(style);
      if (photoChanged) res = await saveGuestPhotoBoxApi(photoBox);
      applyDesign(res.data);
      showSuccess("Guest card positions saved.");
    } catch (err) {
      showError(getErrorText(err, "Failed to save the positions"));
    } finally {
      setSaving(false);
    }
  };

  const nameCss = useMemo(
    () => ({
      left: `${style.centerXPct}%`,
      top: `${style.topPct}%`,
      color: style.color,
      fontSize: `${style.fontSizePct * nameScale(previewName || "Name")}cqw`,
    }),
    [style, previewName]
  );

  const copyLink = async () => {
    if (await copyText(guestCardLink)) showSuccess("Guest card link copied.");
    else showError("Could not copy. Please copy the link manually.");
  };

  return (
    <CommonListLayout
      pageClassName="contactPage__page"
      mainAreaClassName="contactPage__mainArea"
      contentClassName="contactPage__content"
      headerTitle="Guest Card"
    >
      <CommonPageHeader
        containerClassName="contactPage__topRow"
        title="Guest Card"
        titleClassName="contactPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="contactPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="contactPage__breadcrumbActive">Guest Card</span>
          </div>
        }
        actions={
          <div className="contactPage__headerActions">
            <button type="button" className="contactPage__createButton" disabled={busy} onClick={() => fileRef.current?.click()}>
              <FaImage />
              {busy ? "Please wait..." : design?.hasDesign ? "Change Guest Card Design" : "Upload Guest Card Design"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              hidden
              onChange={handleFile}
            />
          </div>
        }
      />

      <div className="contactPage__tableCard appCard">
        <div className="inviteCards__designStrip">
          <span className="inviteCards__designText">
            {design?.hasDesign
              ? `Guest card design: ${design.originalName || "uploaded image"} (${design.width} x ${design.height}px)`
              : "No guest card design uploaded yet. Click Upload Guest Card Design (JPG / PNG, max 15 MB). Leave the photo spot and the name spot empty on the design."}
          </span>
          <span className="inviteCards__designLinks">
            {design?.hasDesign && (
              <button type="button" className="inviteCards__linkBtn inviteCards__linkBtn--danger" disabled={busy} onClick={handleRemove}>
                Remove
              </button>
            )}
          </span>
        </div>

        <div className="inviteCards__designStrip">
          <span className="inviteCards__designText">
            Guest card link (send this to guests - they upload their photo, type their name and download the card):{" "}
            <strong style={{ wordBreak: "break-all" }}>{guestCardLink}</strong>
          </span>
          <span className="inviteCards__designLinks">
            <button type="button" className="inviteCards__linkBtn" onClick={copyLink}>Copy link</button>
          </span>
        </div>

        {design?.hasDesign && (
          <div className="gcd-layout">
            {/* the card: click to place */}
            <div className="gcd-stage">
              <div className="gc-card" style={{ cursor: "crosshair" }} onClick={placeOnCard}>
                {imageUrl ? (
                  <img className="gc-design" src={imageUrl} alt="Guest card design" draggable={false} />
                ) : (
                  <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
                )}
                {sampleUrl ? (
                  <div
                    className="gcd-photo-sample"
                    aria-hidden="true"
                    style={{
                      left: `${photoBox.xPct}%`,
                      top: `${photoBox.yPct}%`,
                      width: `${photoBox.wPct}%`,
                      height: `${photoBox.hPct}%`,
                      borderRadius: photoBox.shape === "circle" ? "50%" : 6,
                    }}
                  >
                    <img src={sampleUrl} alt="" />
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: `${photoBox.xPct}%`,
                      top: `${photoBox.yPct}%`,
                      width: `${photoBox.wPct}%`,
                      height: `${photoBox.hPct}%`,
                      border: "2px dashed #2f80ed",
                      background: "rgba(47,128,237,0.28)",
                      borderRadius: photoBox.shape === "circle" ? "50%" : 6,
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "3cqw",
                      fontWeight: 600,
                    }}
                  >
                    Guest photo
                  </div>
                )}
                <div className="gc-name" style={nameCss}>{previewName || "Name"}</div>
              </div>
              <p className="gc-note" style={{ textAlign: "left" }}>
                Click on the card to move the {placeMode === "photo" ? "photo" : "name"} (the click is its centre).
              </p>
            </div>

            {/* controls */}
            <div>
              <div className="gcd-panel">
                <h3>1. Guest photo</h3>
                <p>Upload any test photo to see how a guest's photo will look. It is only for this preview and is not saved.</p>
                <div className="gcd-btnrow" style={{ marginBottom: 14 }}>
                  <button type="button" className="gcd-small main" onClick={() => sampleRef.current?.click()}>
                    {sampleUrl ? "Change test photo" : "Upload test photo"}
                  </button>
                  {sampleUrl && (
                    <button type="button" className="gcd-small soft" onClick={() => setSampleUrl("")}>
                      Remove test photo
                    </button>
                  )}
                  <input ref={sampleRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={handleSample} />
                </div>
                <div className="gcd-field">
                  <label htmlFor="gcdW">Width</label>
                  <input id="gcdW" type="range" min="10" max="100" step="1" value={photoBox.wPct}
                    onChange={(e) => {
                      const wPct = Number(e.target.value);
                      setPhotoBox((p) => ({ ...p, wPct, xPct: Math.min(p.xPct, 100 - wPct) }));
                    }} />
                  <span className="gcd-val">{Math.round(photoBox.wPct)}%</span>
                </div>
                <div className="gcd-field">
                  <label htmlFor="gcdH">Height</label>
                  <input id="gcdH" type="range" min="10" max="100" step="1" value={photoBox.hPct}
                    onChange={(e) => {
                      const hPct = Number(e.target.value);
                      setPhotoBox((p) => ({ ...p, hPct, yPct: Math.min(p.yPct, 100 - hPct) }));
                    }} />
                  <span className="gcd-val">{Math.round(photoBox.hPct)}%</span>
                </div>
                <div className="gcd-field" style={{ gridTemplateColumns: "110px 1fr" }}>
                  <label htmlFor="gcdShape">Shape</label>
                  <select id="gcdShape" className="fieldInput" value={photoBox.shape}
                    onChange={(e) => setPhotoBox((p) => ({ ...p, shape: e.target.value }))}>
                    <option value="circle">Circle</option>
                    <option value="rect">Rectangle</option>
                  </select>
                </div>
              </div>

              <div className="gcd-panel">
                <h3>2. Name</h3>
                <p>The name is written on the card in this colour and size. Long names shrink automatically.</p>
                <div className="gcd-field" style={{ gridTemplateColumns: "110px 1fr" }}>
                  <label htmlFor="gcdName">Preview name</label>
                  <input id="gcdName" className="fieldInput" maxLength={60} value={previewName}
                    onChange={(e) => setPreviewName(e.target.value)} />
                </div>
                <div className="gcd-field">
                  <label htmlFor="gcdSize">Text size</label>
                  <input id="gcdSize" type="range" min="1.5" max="12" step="0.1" value={style.fontSizePct}
                    onChange={(e) => setStyle((p) => ({ ...p, fontSizePct: Number(e.target.value) }))} />
                  <span className="gcd-val">{style.fontSizePct.toFixed(1)}</span>
                </div>
                <div className="gcd-field" style={{ gridTemplateColumns: "110px 1fr" }}>
                  <label htmlFor="gcdColor">Text colour</label>
                  <input id="gcdColor" type="color" value={style.color}
                    onChange={(e) => setStyle((p) => ({ ...p, color: e.target.value }))} />
                </div>
              </div>

              <div className="gcd-panel">
                <h3>3. Position</h3>
                <p>Choose what to move, then click on the card or use the arrows for small steps.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
                  <div className="gcd-btnrow">
                    {[["photo", "Move photo"], ["name", "Move name"]].map(([value, label]) => (
                      <button key={value} type="button"
                        className={`gcd-small ${placeMode === value ? "on" : "soft"}`}
                        onClick={() => setPlaceMode(value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="gcd-nudge" aria-label="Move in small steps">
                    <span />
                    <button type="button" onClick={() => nudge(0, -0.5)} aria-label="Up">↑</button>
                    <span />
                    <button type="button" onClick={() => nudge(-0.5, 0)} aria-label="Left">←</button>
                    <span />
                    <button type="button" onClick={() => nudge(0.5, 0)} aria-label="Right">→</button>
                    <span />
                    <button type="button" onClick={() => nudge(0, 0.5)} aria-label="Down">↓</button>
                    <span />
                  </div>
                </div>
              </div>

              <div className="gcd-savebar">
                <button type="button" className="modalCreateButton" disabled={saving || !changed} onClick={handleSave}>
                  {saving ? "Saving..." : "Save positions"}
                </button>
                <button type="button" className="modalCloseButton" disabled={saving}
                  onClick={() => { setStyle({ ...DEFAULT_STYLE }); setPhotoBox({ ...DEFAULT_PHOTO_BOX }); }}>
                  Reset
                </button>
                <a className="inviteCards__linkBtn" href={guestCardLink} target="_blank" rel="noreferrer">
                  Open guest page
                </a>
                {changed && <span className="hint">You have unsaved changes.</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </CommonListLayout>
  );
}