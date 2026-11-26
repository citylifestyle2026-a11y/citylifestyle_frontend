import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import {
  FaFileDownload,
  FaInfoCircle,
  FaPhoneAlt,
  FaShareAlt,
  FaTicketAlt,
  FaUser,
  FaUsers,
} from "react-icons/fa";

import cityLogo from "../assets/images/run/city-lifestyle-white.png";
import socialLogo from "../assets/images/run/social-gathering.png";
import runLogo from "../assets/images/run/lets-run-black.png";
import "../assets/CSS/RunTicket.css";

// Entry pass of a Let's Run registration (/ticket?qr=<Invitation ID>).
// Design: white pass on a dark photo - logo, green date, guest / mobile /
// allowed entry, QR, verification code. No company / brand, no price line.
// The Terms & Conditions are the ones written on the Event
// (Event -> Terms & Conditions), so they show up as soon as the event has them.
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

const IST = "Asia/Kolkata";

const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}TH`;
  return `${n}${{ 1: "ST", 2: "ND", 3: "RD" }[n % 10] || "TH"}`;
};

// "29TH NOVEMBER 2026" (IST)
const dayLabel = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${ordinal(Number(get("day")))} ${get("month").toUpperCase()} ${get("year")}`;
};

export default function RunTicket({ invite }) {
  useMontserrat();
  const { event } = invite;
  const used = invite.isUsed;
  const [copied, setCopied] = useState(false);

  // Start date - end date when the event runs over more than one day.
  const startDay = dayLabel(event.startDateTime) || String(event.date || "").toUpperCase();
  const endDay = dayLabel(event.endDateTime);
  const dateText = [startDay, endDay && endDay !== startDay ? endDay : ""].filter(Boolean).join(" - ");
  const timeText = [event.time, event.endTime && event.endTime !== event.time ? event.endTime : ""]
    .filter(Boolean)
    .join(" - ")
    .toUpperCase();

  const admit = Math.max(1, Number(invite.numberOfGuests) || 1);
  const terms = String(event.termsConditions || "").trim();

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${event.title} - Entry Pass`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share sheet closed by the person - nothing to do
    }
  };

  return (
    <div className="runTicket">
      <main className="runTicket__pass">
        <section className="runTicket__part runTicket__part--top">
          <span className="runTicket__badge">
            <FaTicketAlt aria-hidden="true" /> Official Entry Pass
          </span>
          <img className="runTicket__runLogo" src={runLogo} alt={event.title || "Let's Run"} />
          {(dateText || timeText) && (
            <p className="runTicket__when">
              {dateText && <span>{dateText}</span>}
              {timeText && <span>{timeText}</span>}
            </p>
          )}
        </section>

        <div className="runTicket__gap" aria-hidden="true">
          <i className="runTicket__dash" />
        </div>

        <section className="runTicket__part runTicket__part--bottom">
          <ul className="runTicket__rows">
            <li>
              <FaUser aria-hidden="true" />
              <span>Guest Name</span>
              <b>{invite.guestName}</b>
            </li>
            {invite.mobileNumber && (
              <li>
                <FaPhoneAlt aria-hidden="true" />
                <span>Mobile</span>
                <b>{invite.mobileNumber}</b>
              </li>
            )}
            <li>
              <FaUsers aria-hidden="true" />
              <span>Allowed Entry</span>
              <b>Admit {admit}</b>
            </li>
          </ul>

          <div className="runTicket__qrBox">
            <img
              className={`runTicket__qr${used ? " runTicket__qr--off" : ""}`}
              src={invite.qrImage}
              alt={`QR code for ${invite.invitationId}`}
            />
          </div>

          <p className="runTicket__codeLabel">Booking / Verification Code</p>
          <p className="runTicket__code">{invite.invitationId}</p>

          {used ? (
            <span className="runTicket__status runTicket__status--used">
              <FaTicketAlt aria-hidden="true" /> Entry Pass Already Used
            </span>
          ) : (
            <span className="runTicket__status">
              <FaTicketAlt aria-hidden="true" /> Valid Entry Pass
            </span>
          )}
        </section>
      </main>

      <p className="runTicket__note">
        <FaInfoCircle aria-hidden="true" />
        <span>
          Please keep this screen ready and present the QR code at the reception / gate check-in for
          instant verification.
        </span>
      </p>

      <div className="runTicket__buttons">
        <button type="button" className="runTicket__btn runTicket__btn--dark" onClick={() => window.print()}>
          <FaFileDownload aria-hidden="true" /> Save / Print
        </button>
        <button type="button" className="runTicket__btn runTicket__btn--green" onClick={handleShare}>
          <FaShareAlt aria-hidden="true" /> {copied ? "Link Copied" : "Share Link"}
        </button>
      </div>

      {terms && (
        <section className="runTicket__terms">
          <h2>Terms and Conditions</h2>
          <div
            className="runTicket__termsBody"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(terms) }}
          />
        </section>
      )}

      <footer className="runTicket__footer">
        <img src={cityLogo} alt="City Lifestyle" />
        <img src={socialLogo} alt="Social Gathering" />
      </footer>
    </div>
  );
}
