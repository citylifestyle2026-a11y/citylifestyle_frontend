import { useEffect, useState } from "react";
import { FaCheckCircle, FaWhatsapp, FaTicketAlt } from "react-icons/fa";

import { getLetsRunInfoApi, submitLetsRunApi } from "../services/letsRunService";
import { MOBILE_ERROR_MESSAGE, normalizeMobileNumber } from "../utilits/mobileNumber";
import { getErrorText } from "../utilits/apiError";
import logo from "../assets/images/logo/city-lifestyle-logo.jpg";
import "../assets/CSS/PublicLetsRun.css";

// Public page  <site>/lets-run   (no login)
//
//   Name + mobile number  ->  Register
//   The backend registers the person for the CURRENT ACTIVE EVENT (the first
//   one when several are active) and sends the ticket QR link on WhatsApp.
export default function PublicLetsRun() {
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

  const ticketHref = result?.qrNumber ? `/ticket?qr=${result.qrNumber}` : "";

  return (
    <div className="letsRun">
      <div className="letsRun__card">
        <img className="letsRun__logo" src={logo} alt="City Lifestyle" />

        {loading && <p className="letsRun__muted">Loading...</p>}

        {!loading && infoError && !result && (
          <div className="letsRun__center">
            <h1 className="letsRun__title">Registration closed</h1>
            <p className="letsRun__text">{infoError}</p>
          </div>
        )}

        {!loading && info && !result && (
          <>
            <h1 className="letsRun__title">Let&rsquo;s Run</h1>
            <p className="letsRun__event">{info.eventTitle}</p>
            <p className="letsRun__meta">
              {[info.date, info.time, info.venueName].filter(Boolean).join(" | ")}
            </p>

            <form className="letsRun__form" onSubmit={handleSubmit} noValidate>
              <div className="letsRun__field">
                <label htmlFor="letsRunName">
                  Name <b>*</b>
                </label>
                <input
                  id="letsRunName"
                  type="text"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
                {errors.name && <p className="letsRun__error">{errors.name}</p>}
              </div>

              <div className="letsRun__field">
                <label htmlFor="letsRunMobile">
                  Mobile number (WhatsApp) <b>*</b>
                </label>
                <div className="letsRun__mobile">
                  <span>+91</span>
                  <input
                    id="letsRunMobile"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d+\s-]/g, ""))}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                  />
                </div>
                {errors.mobile && <p className="letsRun__error">{errors.mobile}</p>}
                <p className="letsRun__hint">Your entry QR is sent on this WhatsApp number.</p>
              </div>

              {submitError && <p className="letsRun__error letsRun__error--box">{submitError}</p>}

              <button type="submit" className="letsRun__button" disabled={submitting}>
                {submitting ? "Registering..." : "Register"}
              </button>
            </form>
          </>
        )}

        {result && (
          <div className="letsRun__center">
            <div className="letsRun__tick">
              <FaCheckCircle />
            </div>
            <h1 className="letsRun__title">
              {result.alreadyRegistered ? "You are already registered" : "You're registered!"}
            </h1>
            <p className="letsRun__text">
              {result.whatsappSent ? (
                <>
                  <FaWhatsapp /> Your ticket with the entry QR has been sent on WhatsApp.
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
      </div>
    </div>
  );
}
