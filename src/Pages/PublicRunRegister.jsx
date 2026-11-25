import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCheckCircle, FaDownload, FaWhatsapp, FaEnvelope } from "react-icons/fa";

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
import "../assets/CSS/RunRegistration.css";

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

    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RX.test(email.trim())) next.email = "Enter a valid email address.";

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

  return (
    <div className="runPublic">
      <div className="runPublic__card">
        <img className="runPublic__logo" src={logo} alt="City Lifestyle" />

        {state === "loading" && (
          <div className="runPublic__center">
            <div className="runPublic__spinner" aria-label="Loading" />
            <p className="runPublic__muted">Loading your registration...</p>
          </div>
        )}

        {state === "error" && (
          <div className="runPublic__center">
            <h1 className="runPublic__title">Link not valid</h1>
            <p className="runPublic__text">{loadError}</p>
            <p className="runPublic__muted">Please ask the organiser to send you a new link.</p>
          </div>
        )}

        {state === "form" && (
          <>
            <h1 className="runPublic__title">Run Registration</h1>
            <p className="runPublic__text">
              Hello{name ? `, ${name.split(" ")[0]}` : ""}! Complete the steps below to get your entry QR.
            </p>

            {/* progress */}
            <ol className="runPublic__steps" aria-label="Progress">
              <li className={`runPublic__step ${step >= 1 ? "runPublic__step--on" : ""}`}>
                <span>1</span> Distance
              </li>
              <li className="runPublic__stepLine" aria-hidden="true" />
              <li className={`runPublic__step ${step >= 2 ? "runPublic__step--on" : ""}`}>
                <span>2</span> Your details
              </li>
            </ol>

            {step === 1 && (
              <div className="runPublic__form">
                <div className="runPublic__field">
                  <label htmlFor="runDistance">
                    Select distance <b>*</b>
                  </label>
                  <select
                    id="runDistance"
                    value={distance}
                    onChange={(e) => {
                      setDistance(e.target.value);
                      setErrors({});
                    }}
                  >
                    <option value="">Select distance</option>
                    {RUN_DISTANCES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {errors.distance && <p className="runPublic__error">{errors.distance}</p>}
                </div>

                <button type="button" className="runPublic__button" onClick={goToDetails}>
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <form className="runPublic__form" onSubmit={handleSubmit} noValidate>
                <div className="runPublic__chosen">
                  <span>
                    Distance: <b>{distanceLabel(distance)}</b>
                  </span>
                  <button type="button" onClick={() => setStep(1)} disabled={submitting}>
                    Change
                  </button>
                </div>

                <div className="runPublic__field">
                  <label htmlFor="runPubName">
                    Name <b>*</b>
                  </label>
                  <input
                    id="runPubName"
                    type="text"
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                  {errors.name && <p className="runPublic__error">{errors.name}</p>}
                </div>

                <div className="runPublic__field">
                  <label htmlFor="runPubMobile">Mobile number (WhatsApp)</label>
                  <input
                    id="runPubMobile"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(sanitizeMobileInput(e.target.value))}
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                  />
                  {errors.mobile && <p className="runPublic__error">{errors.mobile}</p>}
                  <p className="runPublic__hint">Your QR is sent on this WhatsApp number. You can change it if needed.</p>
                </div>

                <div className="runPublic__field">
                  <label htmlFor="runPubEmail">
                    Email <b>*</b>
                  </label>
                  <input
                    id="runPubEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {errors.email && <p className="runPublic__error">{errors.email}</p>}
                </div>

                {submitError && <p className="runPublic__error runPublic__error--box">{submitError}</p>}

                <button type="submit" className="runPublic__button" disabled={submitting}>
                  {submitting ? "Registering..." : "Register"}
                </button>
              </form>
            )}
          </>
        )}

        {state === "done" && result && (
          <>
            <div className="runPublic__tick">
              <FaCheckCircle />
            </div>
            <h1 className="runPublic__title">
              {alreadyRegistered ? "You are already registered" : "Registration successful!"}
            </h1>
            <p className="runPublic__text">
              Show this QR code at the entry gate.
            </p>

            <div className="runPublic__qrBox">
              {result.qrImage ? (
                <img src={result.qrImage} alt="Your entry QR code" />
              ) : (
                <div className="runPublic__qrPlaceholder">
                  {RUN_MOCK ? "QR appears here once the backend is connected (demo mode)" : "QR is being prepared"}
                </div>
              )}
            </div>

            <dl className="runPublic__details">
              <div>
                <dt>Name</dt>
                <dd>{result.name}</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{distanceLabel(result.distance)}</dd>
              </div>
              <div>
                <dt>Registration No.</dt>
                <dd>{result.registrationNumber || "-"}</dd>
              </div>
            </dl>

            {result.qrImage && (
              <button
                type="button"
                className="runPublic__button runPublic__button--ghost"
                onClick={handleDownloadQr}
                disabled={downloading}
              >
                <FaDownload /> {downloading ? "Downloading..." : "Download QR"}
              </button>
            )}

            <p className="runPublic__sent">
              <FaWhatsapp /> The QR is also sent on WhatsApp
              <br />
              <FaEnvelope /> and to your email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
