import { useEffect, useState } from "react";
import {
  FaAward,
  FaBuilding,
  FaCalendarCheck,
  FaChevronDown,
  FaChevronUp,
  FaDirections,
  FaExternalLinkAlt,
  FaDownload,
  FaHeadset,
  FaInfoCircle,
  FaLandmark,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaShareAlt,
  FaShieldAlt,
  FaUser,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";

import { getPublicInvitationApi } from "../services/publicInvitationService";
import parvLogo from "../assets/images/pass/parv-logo-maroon.png";
import associationLogos from "../assets/images/pass/association-logos.png";
import supporterLogos from "../assets/images/pass/supporter-logos.png";
import "../assets/CSS/Ticket.css";

// The guest pass. Used in two places:
//  - public page  /ticket?qr=<8-digit invitationId>   (opened from WhatsApp)
//  - admin "View Booking" page (embedded) for single-QR bookings
// It always reads the live booking, so after "Edit Booking" (e.g. quantity
// 1 -> 3) the pass shows "Admit 3" without the link ever changing.
// ONE QR for the whole booking; "Allowed Entry" = booking quantity.
// The QR itself encodes only the 8-digit Invitation ID (shown under it as
// "Booking / Verification Code"), so it is a small, easy-to-scan code.
export default function GuestPass({ invitationId: rawInvitationId, embedded = false }) {
  const invitationId = String(rawInvitationId || "").trim();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
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

  // Public page: browser tab / "Save as PDF" file name -> "<Event> - Guest Pass"
  useEffect(() => {
    if (embedded || !invite?.event?.title) return undefined;
    const previous = document.title;
    document.title = `${invite.event.title} - Guest Pass`;
    return () => {
      document.title = previous;
    };
  }, [embedded, invite]);

  const passUrl = `${window.location.origin}/ticket?qr=${invitationId}`;

  const handleShare = async () => {
    const url = embedded ? passUrl : window.location.href;
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
      <div className={`pass${embedded ? " pass--embedded" : ""}`}>
        <p className={`pass__state${error ? " pass__state--error" : ""}`}>
          {loading ? "Loading your pass…" : error || "Invitation not found."}
        </p>
      </div>
    );
  }

  const { event } = invite;
  const guests = invite.numberOfGuests;
  const references = Array.isArray(invite.references) ? invite.references : [];
  const valid = !invite.isUsed && !invite.isCancelled;
  const badge = invite.isCancelled
    ? "Cancelled Pass"
    : invite.isUsed
      ? "Pass Already Used"
      : "Valid Entry Pass";

  return (
    <div className={`pass${embedded ? " pass--embedded" : ""}`}>
      <div className="pass__ticket">
        {/* ---------- top half: branding ---------- */}
        <div className="pass__top">
          <span className="pass__chip">
            <FaAward className="pass__chipIcon" />
            OFFICIAL GUEST PASS
          </span>
          <img className="pass__logo" src={parvLogo} alt="Parv" />
          {/* The Parv logo already spells the event name, so the title is only
              kept for screen readers / SEO. */}
          <h1 className="pass__title pass__srOnly">{event.title}</h1>
          <p className="pass__sub">
            <FaCalendarCheck className="pass__icon" />
            Event Entry Pass
          </p>

          <span className="pass__chip pass__chip--grey pass__chip--block">IN ASSOCIATION WITH</span>
          <img
            className="pass__partners"
            src={associationLogos}
            alt="Luxury automobile partner Navjivan Luxury Cars, Tanishq, Tri Stone, Taneira, Outzidr, Amansara"
          />

          <div className="pass__tear" />
        </div>

        {/* ---------- bottom half: guest details + QR ---------- */}
        <div className="pass__bottom">
          <dl className="pass__rows">
            <div>
              <dt><FaUser className="pass__icon" />Guest Name</dt>
              <dd>{invite.guestName}</dd>
            </div>
            <div>
              <dt><FaBuilding className="pass__icon" />Company/ Brand</dt>
              <dd>{invite.companyName?.trim() || "-"}</dd>
            </div>
            <div>
              <dt><FaPhoneAlt className="pass__icon" />Mobile</dt>
              <dd>{invite.mobileNumber}</dd>
            </div>
            {references.length > 0 && (
              <div className="pass__row--refs">
                <dt><FaUserFriends className="pass__icon" />Invited By</dt>
                <dd>
                  {/* One name: plain text. 2+ names: small chips that wrap onto
                      as many lines as needed, so every name stays visible. */}
                  {references.length === 1 ? (
                    references[0]
                  ) : (
                    <span className="pass__refs">
                      {references.map((name) => (
                        <span className="pass__refChip" key={name}>{name}</span>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt><FaUsers className="pass__icon" />Allowed Entry</dt>
              <dd> {guests}</dd>
            </div>
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
          <p className={`pass__badge${valid ? "" : " pass__badge--bad"}`}>
            <FaShieldAlt className="pass__badgeIcon" />
            {badge}
          </p>

          <span className="pass__chip pass__chip--grey pass__chip--block pass__chip--supported">
            SUPPORTED BY
          </span>
          <img className="pass__partners" src={supporterLogos} alt="Event supporters" />
        </div>
      </div>

      <p className="pass__note">
        <FaInfoCircle className="pass__noteIcon" />
        <span>
          Please Keep this screen ready and present the QR code at the reception /
          gate check-in for instant verification.
        </span>
      </p>

      <div className="pass__actions">
        {embedded ? (
          <a
            className="pass__btn pass__btn--dark"
            href={passUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaExternalLinkAlt />
            Open Pass
          </a>
        ) : (
          <button type="button" className="pass__btn pass__btn--dark" onClick={() => window.print()}>
            <FaDownload />
            Save/ Print
          </button>
        )}
        <button type="button" className="pass__btn pass__btn--pink" onClick={handleShare}>
          <FaShareAlt />
          {copied ? "Link Copied" : "Share Link"}
        </button>
      </div>
      <div className="pass__help">
        <button
          type="button"
          className="pass__helpHead"
          onClick={() => setHelpOpen((o) => !o)}
          aria-expanded={helpOpen}
        >
          <span className="pass__helpTitle">
            <FaMapMarkerAlt className="pass__icon" />
            Venue &amp; Event Help
          </span>
          {helpOpen ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        {helpOpen && (
          <div className="pass__helpBody">
            <p>
              <FaLandmark className="pass__icon" />
              <span><strong>Venue:</strong> {event.venueName}</span>
            </p>
            <p>
              <FaMapMarkerAlt className="pass__icon" />
              <span><strong>Address:</strong> {event.address}</span>
            </p>
            {event.locationUrl && (
              <p>
                <FaDirections className="pass__icon" />
                <a href={event.locationUrl} target="_blank" rel="noopener noreferrer">
                  Get Google Maps Directions →
                </a>
              </p>  
            )}
            <p>
              <FaHeadset className="pass__icon" />
              <span>
                <strong>Contact:</strong> {invite.contact.name} •{" "}
                <a href={`tel:${invite.contact.number}`}>{invite.contact.number}</a>
              </span>
            </p>
          </div>
        )}
      </div>

    </div>
  );
}