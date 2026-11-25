import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaArrowRight,
  FaCheck,
  FaDownload,
  FaEnvelope,
  FaExclamationTriangle,
  FaLock,
  FaWhatsapp,
} from "react-icons/fa";

import {
  RUN_MOCK,
  RUN_DISTANCES,
  getPublicRunApi,
  submitPublicRunApi,
} from "../services/runRegistrationService";
import { getErrorText } from "../utilits/apiError";
import { saveBlob } from "../utilits/download";
import {
  isValidMobileNumber,
  sanitizeMobileInput,
  toLocalMobileNumber,
  LOCAL_MOBILE_ERROR_MESSAGE,
} from "../utilits/mobileNumber";
import logo from "../assets/images/logo/city-lifestyle-logo.jpg";
import "../assets/CSS/PublicRunRegister.css";

// Public page opened from the WhatsApp link:   /run/:token
//
//   Step 1  ->  dropdown: 5 KM or 10 KM
//   Step 2  ->  name, mobile number (starts as the number the link was sent to,
//               the person can change it - the QR goes to the number they submit),
//               email  ->  Register
//   Done    ->  QR code is shown here, and the backend also sends it on
//               WhatsApp and by email. The same QR is scanned at the entry.
//
// No login. The token in the address is the only thing that identifies the
// person - nothing else (id) is taken from the address.
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const displayMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? `+91 ${digits.slice(2)}` : value || "";
};

export default function PublicRunRegister() {
  const { token } = useParams();

  const [state, setState] = useState("loading"); // loading | form | done | error
  const [loadError, setLoadError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [step, setStep] = useState(1);
  const [distance, setDistance] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

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

    getPublicRunApi(token)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || {};
        setName(data.name || "");
        setMobile(toLocalMobileNumber(data.mobileNumber) || "");
        setEmail(data.email || "");
        setEventTitle(data.eventTitle || "");

        if (data.status === "registered") {
          setResult(data);
          setAlreadyRegistered(true);
          setState("done");
        } else {
          setState("form");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getErrorText(err, "This registration link is not valid."));
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const goToDetails = () => {
    if (!distance) {
      setErrors({ distance: "Please select 5 KM or 10 KM." });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const validateDetails = () => {
    const next = {};
    const cleanName = name.replace(/\s+/g, " ").trim();

    if (!cleanName) next.name = "Name is required.";
    else if (cleanName.length > 60) next.name = "Name is too long (max 60 characters).";

    if (!mobile) next.mobile = "Mobile number is required.";
    else if (!isValidMobileNumber(mobile)) next.mobile = LOCAL_MOBILE_ERROR_MESSAGE;

    // Email is optional; when given it must be valid.
    if (email.trim() && !EMAIL_RX.test(email.trim())) next.email = "Enter a valid email address.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validateDetails()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await submitPublicRunApi(token, {
        distance: Number(distance),
        name: name.replace(/\s+/g, " ").trim(),
        mobile,
        email: email.trim(),
      });
      setResult(res?.data || {});
      setAlreadyRegistered(false);
      setState("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(getErrorText(err, "We could not complete your registration. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!result?.qrImage) return;
    setDownloading(true);
    try {
      const response = await fetch(result.qrImage);
      const blob = await response.blob();
      saveBlob(blob, `Run_QR_${result.registrationNumber || "pass"}.png`);
    } catch {
      // The image is on another address and the browser may block reading it:
      // just open it, the person can long-press / save it from there.
      window.open(result.qrImage, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  const distanceLabel = (value) => (value ? `${value} KM` : "");
  const firstName = name.trim().split(" ")[0];

  return (
    <div className="rr">
      <header className="rr__hero">
        <img className="rr__logo" src={logo} alt="City Lifestyle" />
        <p className="rr__eyebrow">5 KM / 10 KM Run</p>
        <h1 className="rr__heroTitle">Run Registration</h1>
        {eventTitle && <span className="rr__heroEvent">{eventTitle}</span>}
      </header>

      <main className="rr__card">
        {state === "loading" && (
          <div className="rr__center">
            <div className="rr__spinner" role="status" aria-label="Loading" />
            <p className="rr__muted">Loading your registration...</p>
          </div>
        )}

        {state === "error" && (
          <div className="rr__center">
            <div className="rr__stateIcon">
              <FaExclamationTriangle />
            </div>
            <h2 className="rr__stateTitle">Link not valid</h2>
            <p className="rr__muted">{loadError}</p>
            <p className="rr__muted">Please ask the organiser to send you a new link.</p>
          </div>
        )}

        {state === "form" && (
          <>
            <p className="rr__greeting">
              Hello{firstName ? <>, <b>{firstName}</b></> : ""}! Choose your distance and confirm your
              details to get your entry pass.
            </p>

            {/* progress */}
            <ol className="rr__steps" aria-label="Progress">
              <li className={`rr__step rr__step--on ${step > 1 ? "rr__step--done" : ""}`}>
                <span className="rr__stepDot">{step > 1 ? <FaCheck /> : 1}</span> Distance
              </li>
              <li className={`rr__stepLine ${step > 1 ? "rr__stepLine--on" : ""}`} aria-hidden="true" />
              <li className={`rr__step ${step >= 2 ? "rr__step--on" : ""}`}>
                <span className="rr__stepDot">2</span> Your details
              </li>
            </ol>

            {step === 1 && (
              <div className="rr__form">
                <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
                  <legend className="rr__sectionTitle">Select your distance</legend>
                  <div className="rr__choices" role="radiogroup" aria-label="Distance">
                    {RUN_DISTANCES.map((d) => (
                      <label key={d.value} className="rr__choice">
                        <input
                          type="radio"
                          name="distance"
                          value={d.value}
                          checked={distance === d.value}
                          onChange={() => {
                            setDistance(d.value);
                            setErrors({});
                          }}
                        />
                        <span className="rr__choiceBody">
                          <span className="rr__choiceNum">{d.value}</span>
                          <span className="rr__choiceUnit">KM</span>
                        </span>
                        <span className="rr__choiceTick" aria-hidden="true">
                          <FaCheck />
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.distance && (
                    <p className="rr__error" role="alert" style={{ marginTop: 10 }}>
                      {errors.distance}
                    </p>
                  )}
                </fieldset>

                <button type="button" className="rr__button" onClick={goToDetails}>
                  Continue <FaArrowRight />
                </button>
              </div>
            )}

            {step === 2 && (
              <form className="rr__form" onSubmit={handleSubmit} noValidate>
                <div className="rr__chosen">
                  <span>
                    Distance: <b>{distanceLabel(distance)}</b>
                  </span>
                  <button type="button" className="rr__link" onClick={() => setStep(1)} disabled={submitting}>
                    Change
                  </button>
                </div>

                <div className="rr__field">
                  <label className="rr__label" htmlFor="runPubName">
                    Full name <span className="rr__req">*</span>
                  </label>
                  <div className={`rr__inputWrap ${errors.name ? "rr__inputWrap--error" : ""}`}>
                    <input
                      id="runPubName"
                      className="rr__input"
                      type="text"
                      maxLength={60}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      aria-invalid={Boolean(errors.name)}
                    />
                  </div>
                  {errors.name && <p className="rr__error" role="alert">{errors.name}</p>}
                </div>

                <div className="rr__field">
                  <label className="rr__label" htmlFor="runPubMobile">
                    WhatsApp number <span className="rr__req">*</span>
                  </label>
                  <div className={`rr__inputWrap ${errors.mobile ? "rr__inputWrap--error" : ""}`}>
                    <span className="rr__prefix">+91</span>
                    <input
                      id="runPubMobile"
                      className="rr__input"
                      type="tel"
                      inputMode="numeric"
                      value={mobile}
                      onChange={(e) => setMobile(sanitizeMobileInput(e.target.value))}
                      placeholder="10-digit mobile number"
                      autoComplete="tel-national"
                      aria-invalid={Boolean(errors.mobile)}
                    />
                  </div>
                  {errors.mobile && <p className="rr__error" role="alert">{errors.mobile}</p>}
                  <p className="rr__hint">Your pass is sent on this WhatsApp number. You can change it if needed.</p>
                </div>

                <div className="rr__field">
                  <label className="rr__label" htmlFor="runPubEmail">
                    Email <span className="rr__optional">(optional)</span>
                  </label>
                  <div className={`rr__inputWrap ${errors.email ? "rr__inputWrap--error" : ""}`}>
                    <input
                      id="runPubEmail"
                      className="rr__input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                    />
                  </div>
                  {errors.email && <p className="rr__error" role="alert">{errors.email}</p>}
                </div>

                {submitError && <p className="rr__errorBox" role="alert">{submitError}</p>}

                <button type="submit" className="rr__button" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="rr__spinnerSm" aria-hidden="true" /> Registering...
                    </>
                  ) : (
                    <>
                      Complete Registration <FaArrowRight />
                    </>
                  )}
                </button>

                <p className="rr__secure">
                  <FaLock /> Your details are used only for this event.
                </p>
              </form>
            )}
          </>
        )}

        {state === "done" && result && (
          <>
            <div className="rr__tick">
              <FaCheck />
            </div>
            <h2 className="rr__doneTitle">
              {alreadyRegistered ? "You are already registered" : "Registration successful!"}
            </h2>
            <p className="rr__doneText">Show this QR code at the entry gate.</p>

            <div className="rr__qr">
              {result.qrImage ? (
                <img src={result.qrImage} alt="Your entry QR code" />
              ) : (
                <div className="rr__qrPlaceholder">
                  {RUN_MOCK ? "QR appears here once the backend is connected (demo mode)" : "QR is being prepared"}
                </div>
              )}
            </div>

            <dl className="rr__details">
              <div className="rr__detailRow">
                <dt>Name</dt>
                <dd>{result.name}</dd>
              </div>
              <div className="rr__detailRow">
                <dt>Distance</dt>
                <dd>{distanceLabel(result.distance)}</dd>
              </div>
              <div className="rr__detailRow">
                <dt>Registration No.</dt>
                <dd>{result.registrationNumber || "-"}</dd>
              </div>
            </dl>

            {result.qrImage && (
              <button
                type="button"
                className="rr__button rr__button--ghost"
                onClick={handleDownloadQr}
                disabled={downloading}
              >
                <FaDownload /> {downloading ? "Downloading..." : "Download QR"}
              </button>
            )}

            <p className="rr__sent">
              <span>
                <FaWhatsapp /> Your pass is also sent on WhatsApp
              </span>
              {result.email && (
                <span>
                  <FaEnvelope /> and to your email
                </span>
              )}
            </p>
          </>
        )}
      </main>

      <footer className="rr__footer">City Lifestyle</footer>
    </div>
  );
}
