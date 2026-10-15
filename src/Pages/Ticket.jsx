import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getPublicInvitationApi } from "../services/publicInvitationService";
import "../assets/CSS/Ticket.css";

// Public pass page opened from the WhatsApp "Your Digital Invite" link:
//   /ticket?qr=<8-digit invitationId>
// ONE QR for the whole booking; "Allowed Entry" = booking quantity.
export default function Ticket() {
  const [searchParams] = useSearchParams();
  const invitationId = (searchParams.get("qr") || "").trim();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!/^\d{8}$/.test(invitationId)) {
      setError("This invitation link is not valid.");
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    getPublicInvitationApi(invitationId)
      .then((res) => {
        if (!cancelled) setInvite(res?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.status === 404
            ? "Invitation not found. Please check your link."
            : "Unable to load your invitation. Please try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: invite?.event?.title || "Event Pass", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled share – nothing to do */
    }
  };

  if (loading || error || !invite) {
    return (
      <div className="pass">
        <p className={`pass__state${error ? " pass__state--error" : ""}`}>
          {loading ? "Loading your pass…" : error || "Invitation not found."}
        </p>
      </div>
    );
  }

  const { event } = invite;
  const guests = invite.numberOfGuests;
  const valid = !invite.isUsed && !invite.isCancelled;
  const badge = invite.isCancelled
    ? "Cancelled Pass"
    : invite.isUsed
      ? "Pass Already Used"
      : "Valid Entry Pass";

  return (
    <div className="pass">
      <div className="pass__ticket">
        <span className="pass__chip">OFFICIAL GUEST PASS</span>
        <div className="pass__logo" aria-hidden="true">पर्व</div>
        <h1 className="pass__title">{event.title}</h1>
        <p className="pass__sub">Event Entry Pass</p>

        <div className="pass__tear" />

        <dl className="pass__rows">
          <div><dt>Guest Name</dt><dd>{invite.guestName}</dd></div>
          {invite.companyName && (
            <div><dt>Company/ Brand</dt><dd>{invite.companyName}</dd></div>
          )}
          <div><dt>Mobile</dt><dd>{invite.mobileNumber}</dd></div>
          <div><dt>Allowed Entry</dt><dd>Admit {guests}</dd></div>
        </dl>

        <div className="pass__qrBox">
          <img
            src={invite.qrImage}
            alt={`QR code for ${invite.invitationId}`}
            className={`pass__qr${valid ? "" : " pass__qr--off"}`}
          />
        </div>

        <p className="pass__codeLabel">BOOKING / VERIFICATION CODE</p>
        <p className="pass__code">{invite.invitationId}</p>
        <p className={`pass__badge${valid ? "" : " pass__badge--bad"}`}>{badge}</p>
      </div>

      <p className="pass__note">
        Please keep this screen ready and present the QR code at the reception /
        gate check-in for instant verification.
      </p>

      <div className="pass__help">
        <button
          type="button"
          className="pass__helpHead"
          onClick={() => setHelpOpen((o) => !o)}
          aria-expanded={helpOpen}
        >
          <span>Venue &amp; Event Help</span>
          <span>{helpOpen ? "▲" : "▼"}</span>
        </button>

        {helpOpen && (
          <div className="pass__helpBody">
            <p><strong>Venue:</strong> {event.venueName}</p>
            <p><strong>Address:</strong> {event.address}</p>
            <p><strong>Date &amp; Time:</strong> {event.date}, {event.time}</p>
            <p><strong>Dress Code:</strong> {event.dressCode}</p>
            {event.locationUrl && (
              <p>
                <a href={event.locationUrl} target="_blank" rel="noopener noreferrer">
                  Get Google Maps Directions →
                </a>
              </p>
            )}
            <p>
              <strong>Contact:</strong> {invite.contact.name} •{" "}
              <a href={`tel:${invite.contact.number}`}>{invite.contact.number}</a>
            </p>
          </div>
        )}
      </div>

      <div className="pass__actions">
        <button type="button" className="pass__btn pass__btn--dark" onClick={() => window.print()}>
          Save / Print
        </button>
        <button type="button" className="pass__btn pass__btn--pink" onClick={handleShare}>
          {copied ? "Link Copied" : "Share Link"}
        </button>
      </div>
    </div>
  );
}
