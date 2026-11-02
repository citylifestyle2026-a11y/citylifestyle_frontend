import { useEffect, useMemo, useRef, useState } from "react";
import { FaCamera } from "react-icons/fa";

import {
  generateGuestCardApi,
  getGuestCardInfoApi,
  guestCardDesignUrl,
} from "../services/publicGuestCardService";
import "../assets/CSS/GuestCard.css";

const MAX_PHOTO_MB = 10;
const PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

// Same rule the server uses to size the name (short name a bit bigger, long a bit smaller).
const nameScale = (name) => {
  const len = Array.from(name.trim()).length;
  if (!len) return 1;
  return Math.min(1.15, Math.max(0.65, Math.sqrt(15 / len)));
};

// The Blob of a failed request is JSON text - read the message out of it.
const errorText = async (err) => {
  try {
    const data = err?.response?.data;
    if (data instanceof Blob) return JSON.parse(await data.text())?.message || "";
    return data?.message || "";
  } catch {
    return "";
  }
};

// PUBLIC page (no login) opened from the link the admin sends:  /guest-card
// The card is shown like the real invitation: tap the photo spot to upload,
// type a name (it appears on the card live), then create + download.
export default function GuestCard() {
  const [info, setInfo] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cardUrl, setCardUrl] = useState(""); // the finished card (from the server)
  const fileRef = useRef(null);

  useEffect(() => {
    getGuestCardInfoApi()
      .then((res) => (res?.data?.hasDesign ? setInfo(res.data) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => () => photoUrl && URL.revokeObjectURL(photoUrl), [photoUrl]);
  useEffect(() => () => cardUrl && URL.revokeObjectURL(cardUrl), [cardUrl]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ext = `.${String(file.name).split(".").pop().toLowerCase()}`;
    if (!PHOTO_EXTS.includes(ext)) return setError("Please choose a JPG or PNG photo.");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      return setError(`The photo is too big. Maximum ${MAX_PHOTO_MB} MB.`);
    }
    setError("");
    setCardUrl("");
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const cleanName = name.replace(/\s+/g, " ").trim();

  const handleCreate = async () => {
    if (!photo) return setError("Please tap the photo spot and upload your photo.");
    if (!cleanName) return setError("Please type your name.");

    setBusy(true);
    setError("");
    try {
      const blob = await generateGuestCardApi({ photo, name: cleanName });
      setCardUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError((await errorText(err)) || "Could not create the card. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const fileName = `${(cleanName || "invitation").replace(/[^A-Za-z0-9]+/g, "_")}_card.jpg`;

  const nameStyle = useMemo(() => {
    const s = info?.nameStyle;
    if (!s) return {};
    return {
      left: `${s.centerXPct}%`,
      top: `${s.topPct}%`,
      color: s.color,
      fontSize: `${s.fontSizePct * nameScale(cleanName || "Your Name")}cqw`,
    };
  }, [info, cleanName]);

  const box = info?.photoBox;
  const boxStyle = box
    ? { left: `${box.xPct}%`, top: `${box.yPct}%`, width: `${box.wPct}%`, height: `${box.hPct}%` }
    : {};

  return (
    <div className="gc-page">
      <div className="gc-wrap">
        <div className="gc-head">
          <h1>Your Invitation Card</h1>
          {info && <p>Add your photo and name, then download your card.</p>}
        </div>

        {!info && !failed && <div className="gc-msg">Loading...</div>}
        {failed && <div className="gc-msg">The card is not ready yet. Please try again a little later.</div>}

        {info && (
          <>
            {cardUrl ? (
              // Finished card exactly as it will be downloaded.
              <div className="gc-card">
                <img className="gc-design" src={cardUrl} alt="Your invitation card" />
              </div>
            ) : (
              <div className="gc-card">
                <img className="gc-design" src={guestCardDesignUrl(info.version)} alt="Invitation card" draggable={false} />

                <button
                  type="button"
                  className={`gc-photo ${box.shape === "circle" ? "circle" : ""} ${photoUrl ? "has-photo" : ""}`}
                  style={boxStyle}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Upload your photo"
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Your photo" />
                  ) : (
                    <span className="gc-photo-hint">
                      <FaCamera />
                      Tap to add photo
                    </span>
                  )}
                </button>

                <div className={`gc-name ${cleanName ? "" : "placeholder"}`} style={nameStyle}>
                  {cleanName || "Your Name"}
                </div>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              hidden
              onChange={handlePhoto}
            />

            <div className="gc-form">
              <label htmlFor="gcName">Your name</label>
              <input
                id="gcName"
                className="gc-input"
                type="text"
                maxLength={60}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setCardUrl("");
                }}
                placeholder="e.g. Rahul Shah"
              />

              {error && <div className="gc-error">{error}</div>}

              {cardUrl ? (
                <>
                  <div className="gc-row">
                    <a className="gc-btn primary" href={cardUrl} download={fileName}>
                      Download card
                    </a>
                    <button type="button" className="gc-btn ghost" onClick={() => setCardUrl("")}>
                      Edit
                    </button>
                  </div>
                  <p className="gc-note">On iPhone, if it opens in a new tab, press and hold the card and choose Save Image.</p>
                </>
              ) : (
                <div className="gc-row">
                  <button type="button" className="gc-btn primary" disabled={busy} onClick={handleCreate}>
                    {busy ? "Creating your card..." : "Create my card"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}