import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../assets/CSS/site/citytoppers.css";
import SiteHeader from "../../Components/Site/SiteHeader";
import useSiteAOS from "../../hooks/useSiteAOS";

// Google Apps Script Web App URL — UNCHANGED from contact.html.
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzTLbM0mBsz26vMuowccj0_kiW2Erm5UzYR54T21dNIILibU6wiWQEbiHRaBVA_Tvsq/exec";

/**
 * Converted from contact.html ("Join the Community" form).
 *
 * The submission logic is preserved EXACTLY:
 *  - same field names (firstName, lastName, email, phone, profession, reason)
 *  - same native HTML5 `required` validation + checkValidity()/reportValidity()
 *  - same `fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new FormData(form) })`
 *  - same "reach the request = success" assumption (no-cors gives an opaque response)
 *  - same status messages/colors and form.reset() on success
 * Only the DOM APIs (getElementById, form.reset()) became a form ref + React
 * state, and the HTML5 constraint-validation call now runs against that ref.
 */
export default function Contact() {
  useSiteAOS();

  const formRef = useRef(null);
  const [status, setStatus] = useState({ visible: false, color: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = formRef.current;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setSubmitting(true);
    setStatus({ visible: true, color: "#F4DD4E", message: "Sending your application..." });

    try {
      // no-cors: request Google tak pahunch jaata hai aur sheet me save ho jaata hai.
      // Response opaque hota hai (read nahi kar sakte), isliye reach = success maante hain.
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: new FormData(form),
      });
      setStatus({ visible: true, color: "#F4DD4E", message: "Thanks! Your application has been submitted." });
      form.reset();
    } catch (err) {
      setStatus({
        visible: true,
        color: "#ff6b6b",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ct-site">
      <SiteHeader />

      {/* ═══════════════════ JOIN THE COMMUNITY ═══════════════════ */}
      <section className="join-section">
        <div className="join-card" data-aos="zoom-in">
          <Link className="join-close" to="/" aria-label="Close">&times;</Link>

          <div className="join-badge">&#9733;</div>

          <h1 className="join-title">JOIN THE<br />COMMUNITY</h1>
          <p className="join-tagline">START YOUR JOURNEY WITH GUJARAT'S FIRST CAF&Eacute; MEET SOCIAL COMMUNITY</p>

          <form className="join-form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="join-row">
              <input type="text" name="firstName" placeholder="FIRST NAME *" aria-label="First name" required />
              <input type="text" name="lastName" placeholder="LAST NAME *" aria-label="Last name" required />
            </div>

            <input type="email" name="email" placeholder="EMAIL ADDRESS *" aria-label="Email address" required />

            <input type="tel" name="phone" placeholder="PHONE NUMBER *" aria-label="Phone number" required />

            <input
              type="text"
              name="profession"
              placeholder="PROFESSION / ROLE *"
              aria-label="Profession / Role"
              required
            />

            <textarea
              name="reason"
              rows={4}
              placeholder="WHY DO YOU WANT TO JOIN CITY TOPPERS? *"
              aria-label="Why do you want to join City Toppers?"
              required
            ></textarea>

            <div className="join-actions">
              <button type="submit" className="join-submit" disabled={submitting}>
                {submitting ? "Submitting..." : <>Submit Application &rarr;</>}
              </button>
            </div>
            {status.visible && (
              <p className="join-status" style={{ color: status.color }}>
                {status.message}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
