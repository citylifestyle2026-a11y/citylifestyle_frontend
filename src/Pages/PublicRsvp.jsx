import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCheckCircle, FaRegCalendarCheck, FaMapMarkerAlt, FaClock } from "react-icons/fa";

import { getPublicRsvpApi, submitPublicRsvpApi } from "../services/publicRsvpService";
import logo from "../assets/images/logo/city-lifestyle-logo.jpg";
import "../assets/CSS/PublicRsvp.css";

// Public page opened from the Yes / No buttons of the attendance-reminder
// WhatsApp message:
//   /rsvp/yes/:token     /rsvp/no/:token
//
// It is a stand-alone page: no link to it exists anywhere on the website,
// it is not indexed by search engines (noindex below), and it only works with
// the guest's own private token. Opening the page saves the answer straight
// away (one tap = done); the guest can switch the answer on the same page,
// and a guest who taps the other button later simply updates their answer.
const firstNameOf = (name) => String(name || "").trim().split(/\s+/)[0] || "";

export default function PublicRsvp() {
  const { answer: rawAnswer, token } = useParams();
  const answer = String(rawAnswer || "").toLowerCase();

  const [state, setState] = useState("loading"); // loading | done | error
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);

  // React 18 StrictMode runs effects twice in development; only save once.
  const savedFor = useRef("");

  // Keep this page out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);

    const previousTitle = document.title;
    document.title = "Attendance Confirmation | City Lifestyle";

    return () => {
      document.head.removeChild(meta);
      document.title = previousTitle;
    };
  }, []);

  const save = useCallback(
    async (value) => {
      try {
        const res = await submitPublicRsvpApi(token, value);
        setInfo(res?.data || null);
        setStatus(res?.data?.status || value);
        setError("");
        setState("done");
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "We could not save your response right now. Please try again."
        );
        setState("error");
      }
    },
    [token]
  );

  useEffect(() => {
    if (answer !== "yes" && answer !== "no") {
      setError("This link is not valid.");
      setState("error");
      return;
    }

    const key = `${token}:${answer}`;
    if (savedFor.current === key) return;
    savedFor.current = key;

    setState("loading");
    save(answer);
  }, [answer, token, save]);

  const handleSwitch = async () => {
    const next = status === "yes" ? "no" : "yes";
    setSwitching(true);
    await save(next);
    setSwitching(false);
  };

  const name = firstNameOf(info?.guestName);
  const event = info?.event;
  const isYes = status === "yes";

  return (
    <div className="rsvpPage">
      <div className="rsvpCard">
        <img className="rsvpCard__logo" src={logo} alt="City Lifestyle" />

        {state === "loading" && (
          <div className="rsvpCard__center">
            <div className="rsvpCard__spinner" aria-label="Saving your response" />
            <p className="rsvpCard__muted">Saving your response...</p>
          </div>
        )}

        {state === "error" && (
          <div className="rsvpCard__center">
            <h1 className="rsvpCard__title">Unable to process your response</h1>
            <p className="rsvpCard__text">{error}</p>
            <p className="rsvpCard__muted">
              If you need any help, please contact the City Lifestyle team.
            </p>
          </div>
        )}

        {state === "done" && event && (
          <>
            <div className={`rsvpCard__icon ${isYes ? "rsvpCard__icon--yes" : "rsvpCard__icon--no"}`}>
              {isYes ? <FaCheckCircle /> : <FaRegCalendarCheck />}
            </div>

            {isYes ? (
              <>
                <h1 className="rsvpCard__title">Your attendance is confirmed</h1>
                <p className="rsvpCard__text">
                  Dear {name || "Guest"}, thank you for confirming. We are delighted
                  that you will be joining us at <strong>{event.title}</strong> and
                  look forward to welcoming you.
                </p>
              </>
            ) : (
              <>
                <h1 className="rsvpCard__title">Thank you for letting us know</h1>
                <p className="rsvpCard__text">
                  Dear {name || "Guest"}, we have noted that you will not be able to
                  attend <strong>{event.title}</strong>. We are sorry to miss you and
                  hope to welcome you at a future edition.
                </p>
              </>
            )}

            <dl className="rsvpCard__details">
              <div>
                <dt><FaRegCalendarCheck /> Date</dt>
                <dd>{event.date}</dd>
              </div>
              <div>
                <dt><FaClock /> Time</dt>
                <dd>{event.time}</dd>
              </div>
              <div>
                <dt><FaMapMarkerAlt /> Venue</dt>
                <dd>
                  {event.venue}
                  {event.address ? <span className="rsvpCard__sub">{event.address}</span> : null}
                </dd>
              </div>
            </dl>

            {isYes && event.mapLink ? (
              <a className="rsvpCard__link" href={event.mapLink} target="_blank" rel="noreferrer">
                View venue location
              </a>
            ) : null}

            <div className="rsvpCard__switch">
              <span>{isYes ? "Your plans changed?" : "Changed your mind?"}</span>
              <button type="button" onClick={handleSwitch} disabled={switching}>
                {switching
                  ? "Updating..."
                  : isYes
                  ? "I will not be able to attend"
                  : "Yes, I will attend"}
              </button>
            </div>

            <p className="rsvpCard__footer">
              Warm regards,
              <br />
              Team City Lifestyle
            </p>
          </>
        )}
      </div>
    </div>
  );
}
