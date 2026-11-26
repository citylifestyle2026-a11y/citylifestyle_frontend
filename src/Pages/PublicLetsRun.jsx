import { useEffect, useState } from "react";
import { FaArrowRight, FaCheckCircle, FaStar, FaTicketAlt, FaTimes, FaWhatsapp } from "react-icons/fa";

import { getLetsRunInfoApi, submitLetsRunApi } from "../services/letsRunService";
import { MOBILE_ERROR_MESSAGE, normalizeMobileNumber } from "../utilits/mobileNumber";
import { getErrorText } from "../utilits/apiError";
import cityLogo from "../assets/images/run/city-lifestyle-white.png";
import socialLogo from "../assets/images/run/social-gathering.png";
import runLogo from "../assets/images/run/lets-run-white.png";
import "../assets/CSS/PublicLetsRun.css";

// Public page  <site>/lets-run   (no login)
//
//   Name + mobile number  ->  Submit Application
//   The backend registers the person for the CURRENT ACTIVE EVENT (the first
//   one when several are active) and sends the ticket QR link on WhatsApp.
// Montserrat (design font) is added as a <link>, so if Google Fonts cannot be
// reached the page still renders, just with the Poppins fallback.
const FONT_ID = "montserrat-font";
const useMontserrat = () => {
  useEffect(() => {
    if (document.getElementById(FONT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
};

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}TH`;
  return `${n}${{ 1: "ST", 2: "ND", 3: "RD" }[n % 10] || "TH"}`;
};

// info.date comes from the backend as DD-MM-YYYY  ->  "29TH NOVEMBER 2026"
const prettyDate = (value) => {
  const m = String(value || "").match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return String(value || "").toUpperCase();
  const day = Number(m[1]);
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${ordinal(day)} ${month} ${m[3]}` : String(value).toUpperCase();
};

export default function PublicLetsRun() {
  useMontserrat();
  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  // Keep this page out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getLetsRunInfoApi()
      .then((res) => {
        if (!cancelled) setInfo(res?.data || null);
      })
      .catch((err) => {
        if (!cancelled) setInfoError(getErrorText(err, "Registration is not open right now."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const validate = () => {
    const next = {};
    const cleanName = name.replace(/\s+/g, " ").trim();

    if (!cleanName) next.name = "Name is required.";
    else if (cleanName.length > 60) next.name = "Name is too long (max 60 characters).";

    if (!mobile.trim()) next.mobile = "Mobile number is required.";
    else if (!normalizeMobileNumber(mobile)) next.mobile = MOBILE_ERROR_MESSAGE;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await submitLetsRunApi({
        name: name.replace(/\s+/g, " ").trim(),
        mobile: normalizeMobileNumber(mobile),
      });
      setResult(res?.data || {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(getErrorText(err, "We could not complete your registration. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // The X on the card clears what was typed.
  const handleClear = () => {
    setName("");
    setMobile("");
    setErrors({});
    setSubmitError("");
  };

  const ticketHref = result?.qrNumber ? `/ticket?qr=${result.qrNumber}` : "";
  const dateText = info?.date ? prettyDate(info.date) : "";
  const timeText = info?.time ? `${String(info.time).toUpperCase()} ONWARDS` : "";

  return (
    <div className="letsRun">
      <div className="letsRun__top">
        <img className="letsRun__cityLogo" src={cityLogo} alt="City Lifestyle" />
        <img className="letsRun__socialLogo" src={socialLogo} alt="Social Gathering" />
      </div>

      <header className="letsRun__hero">
        <img className="letsRun__runLogo" src={runLogo} alt={info?.eventTitle || "Let's Run"} />
        {(dateText || timeText) && (
          <p className="letsRun__date">
            {dateText && <span>{dateText}</span>}
            {timeText && <span>{timeText}</span>}
          </p>
        )}
      </header>

      <main className="letsRun__card">
        {loading && <p className="letsRun__muted">Loading...</p>}

        {!loading && infoError && !result && (
          <div className="letsRun__center">
            <h2 className="letsRun__heading letsRun__heading--center">Registration closed</h2>
            <p className="letsRun__text">{infoError}</p>
          </div>
        )}

        {!loading && info && !result && (
          <>
            <button type="button" className="letsRun__close" onClick={handleClear} aria-label="Clear form">
              <FaTimes />
            </button>

            <span className="letsRun__star" aria-hidden="true">
              <FaStar />
            </span>
            <h2 className="letsRun__heading">Register Now</h2>
            <p className="letsRun__sub">Start your journey Let&rsquo;s Run</p>

            <form className="letsRun__form" onSubmit={handleSubmit} noValidate>
              <div className="letsRun__field">
                <label className="letsRun__srOnly" htmlFor="letsRunName">
                  Name
                </label>
                <input
                  id="letsRunName"
                  className={errors.name ? "letsRun__input letsRun__input--error" : "letsRun__input"}
                  type="text"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NAME *"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="letsRun__error">{errors.name}</p>}
              </div>

              <div className="letsRun__field">
                <label className="letsRun__srOnly" htmlFor="letsRunMobile">
                  Phone number (WhatsApp)
                </label>
                <input
                  id="letsRunMobile"
                  className={errors.mobile ? "letsRun__input letsRun__input--error" : "letsRun__input"}
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^\d+\s-]/g, ""))}
                  placeholder="PHONE NUMBER *"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.mobile)}
                />
                {errors.mobile && <p className="letsRun__error">{errors.mobile}</p>}
              </div>

              {submitError && <p className="letsRun__alert">{submitError}</p>}

              <div className="letsRun__actions">
                <button type="submit" className="letsRun__button" disabled={submitting}>
                  {submitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      Submit Application <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {result && (
          <div className="letsRun__center">
            <div className="letsRun__tick">
              <FaCheckCircle />
            </div>
            <h2 className="letsRun__heading letsRun__heading--center">
              {result.alreadyRegistered ? "You are already registered" : "You're registered!"}
            </h2>
            <p className="letsRun__text">
              {result.whatsappSent ? (
                <>
                  <FaWhatsapp className="letsRun__wa" /> Your ticket with the entry QR has been sent on WhatsApp.
                </>
              ) : (
                "We could not send the WhatsApp message right now. You can open your ticket below."
              )}
            </p>
            {ticketHref && (
              <a className="letsRun__button letsRun__button--link" href={ticketHref}>
                <FaTicketAlt /> View Ticket
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
