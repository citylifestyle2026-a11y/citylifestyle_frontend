import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/CSS/ViewEvent.css";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getEventById } from "../redux/event/eventThunk";
import DOMPurify from "dompurify";

// DD-MM-YYYY — matches Event.jsx's formatDate exactly, so "Created On"
// here renders identically to the same field on the Event list page.
// Reused below by formatDateTime for the date portion, same as Event.jsx.
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// DD-MM-YYYY hh:mm AM/PM — matches Event.jsx's formatDateTime exactly, used
// here for Start/End Date & Time instead of the raw new Date(...).toLocaleString()
// this page previously called directly. The API returns proper UTC instants
// (see CreateEvent.jsx's toISTISOString, which attaches the explicit +05:30
// offset on save so the stored value is unambiguous regardless of the
// server's own timezone); rendering via the standard local Date getters here
// only controls *display*, so the actual event date/time is never altered.
const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  const hh = String(hours).padStart(2, "0");
  return `${formatDate(dateStr)} ${hh}:${minutes} ${ampm}`;
};

// Shared "empty media slot" styling so the photo and video containers stay
// visually consistent, and so the fallback text is always centered both
// ways inside the box regardless of the card's own width/height.
const mediaContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "260px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  background: "#fafafa",
  overflow: "hidden",
};

// Bounds the media to the container without ever stretching/distorting it —
// maxWidth/maxHeight + objectFit: contain scales it down to fit while
// preserving its natural aspect ratio.
const mediaElementStyle = {
  maxWidth: "100%",
  maxHeight: "320px",
  objectFit: "contain",
};

// Rendered inside the photo/video container whenever there's no media —
// shared with the same "no data" SVG/class (bookingPage-stateIcon) already
// used elsewhere in the project (see EntryReport.jsx's empty-state icon),
// so no new CSS is introduced.
const EmptyMediaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 460 512"
    width="120"
    className="bookingPage-stateIcon"
  >
    <path d="M220.6 130.3l-67.2 28.2V43.2L98.7 233.5l54.7-24.2v130.3l67.2-209.3zm-83.2-96.7l-1.3 4.7-15.2 52.9C80.6 106.7 52 145.8 52 191.5c0 52.3 34.3 95.9 83.4 105.5v53.6C57.5 340.1 0 272.4 0 191.6c0-80.5 59.8-147.2 137.4-158zm311.4 447.2c-11.2 11.2-23.1 12.3-28.6 10.5-5.4-1.8-27.1-19.9-60.4-44.4-33.3-24.6-33.6-35.7-43-56.7-9.4-20.9-30.4-42.6-57.5-52.4l-9.7-14.7c-24.7 16.9-53 26.9-81.3 28.7l2.1-6.6 15.9-49.5c46.5-11.9 80.9-54 80.9-104.2 0-54.5-38.4-102.1-96-107.1V32.3C254.4 37.4 320 106.8 320 191.6c0 33.6-11.2 64.7-29 90.4l14.6 9.6c9.8 27.1 31.5 48 52.4 57.4s32.2 9.7 56.8 43c24.6 33.2 42.7 54.9 44.5 60.3s.7 17.3-10.5 28.5zm-9.9-17.9c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8 8-3.6 8-8z"></path>
  </svg>
);

const ViewEvent = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("description");
  const { id } = useParams();
  const dispatch = useDispatch();

  const { event, loading } = useSelector(
    (state) => state.event
  );
  //view api call
  useEffect(() => {
    if (id) {
      dispatch(getEventById(id));
    }
  }, [dispatch, id]);

  return (
    <div className="Event__page">
      <Sidebar />
      <div className="EventPage__mainArea">
        <Header title="View Event" />
        <div className="viewEvent-wrapper">
          <div className="viewEvent-header">
            <h1 className="viewEvent-title">View Event Details</h1>
            <div className="viewEvent-breadcrumb">
              <span>Dashboard</span>
              <span className="viewEvent-breadcrumbSep">-</span>
              <span className="viewEvent-breadcrumbActive">View Event Details</span>
            </div>
          </div>
          <Link to={'/event'}>
            <button
              type="button"
              className="viewEvent-backLink"
              onClick={() => navigate(-1)}
            >
              <span className="viewEvent-backArrow">&#8592;</span> Back Page
            </button>
          </Link>

          {loading ? (
            <div className="viewEvent-card viewEvent-infoCard">
              Loading event details...
            </div>
          ) : (
          <div className="viewEvent-layout">
            {/* Left column */}
            <div className="viewEvent-leftCol">
              <div className="viewEvent-card viewEvent-infoCard">
                <h2 className="viewEvent-eventName">
                  {event?.title}
                </h2>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Created By</span>
                  <span className="viewEvent-detailValue"> {event?.createdBy?.name || "-"}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Created On</span>
                  <span className="viewEvent-detailValue"> {formatDate(event?.createdAt)}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Start Date &amp; Time</span>
                  <span className="viewEvent-detailValue"> {formatDateTime(event?.startDateTime)}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">End Date &amp; Time</span>
                  <span className="viewEvent-detailValue">  {formatDateTime(event?.endDateTime)}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Venue Name</span>
                  <span className="viewEvent-detailValue">  {event?.venueName}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Latitude</span>
                  <span className="viewEvent-detailValue">  {event?.latitude}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Longitute</span>
                  <span className="viewEvent-detailValue">  {event?.longitude}</span>
                </div>

                <div className="viewEvent-detailBlock">
                  <span className="viewEvent-detailLabel">Address</span>
                  <span className="viewEvent-detailValue">
                    {event?.address}
                  </span>
                </div>

                <div className="viewEvent-detailBlock viewEvent-detailBlockLast">
                  <span className="viewEvent-detailLabel">Ticket Type</span>
                  <ul className="viewEvent-ticketList">
                    {
                      event?.ticketTypes && event.ticketTypes.length > 0 ? (
                        event.ticketTypes.map((ticketType, index) => (
                          <li key={index}>
                            {ticketType}
                          </li>
                        ))
                      ) : (
                        <li>No ticket types available</li>
                      )
                    }
                  </ul>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="viewEvent-rightCol">
              <div className="viewEvent-tabs">
                <button
                  type="button"
                  className={
                    "viewEvent-tab" +
                    (activeTab === "description" ? " viewEvent-tabActive" : "")
                  }
                  onClick={() => setActiveTab("description")}
                >
                  Description / Terms &amp; Conditions
                </button>
                <button
                  type="button"
                  className={
                    "viewEvent-tab" +
                    (activeTab === "media" ? " viewEvent-tabActive" : "")
                  }
                  onClick={() => setActiveTab("media")}
                >
                  Photos &amp; Videos
                </button>
              </div>

              {activeTab === "description" && (
                <div className="viewEvent-card viewEvent-contentCard">
                  <div className="viewEvent-detailBlock">
                    <span className="viewEvent-sectionLabel">Description</span>
                    <span
                      className="viewEvent-detailValue"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(event?.description || "-"),
                      }}
                    />
                  </div>

                  <div className="viewEvent-detailBlock">
                    <span className="viewEvent-sectionLabel">
                      Terms &amp; Conditions
                    </span>
                    <span
                      className="viewEvent-detailValue"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(event?.termsConditions || "-"),
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === "media" && (
                <div className="viewEvent-card viewEvent-contentCard">
                  {(() => {
                    const hasPhoto = Boolean(event?.image);
                    const hasVideo = Boolean(
                      event?.videoLinks && event.videoLinks.length > 0
                    );

                    // Neither exists: one shared empty state instead of the
                    // same icon repeated once under "Photos" and again
                    // under "Videos" — showing it twice for what is really
                    // a single "no media" case reads as a duplicate/bug.
                    if (!hasPhoto && !hasVideo) {
                      return (
                        <div style={mediaContainerStyle}>
                          <EmptyMediaIcon />
                        </div>
                      );
                    }

                    // At least one of Photo/Video actually has content, so
                    // keep the two labeled boxes — each still falls back to
                    // its own icon only if that one specific type is missing.
                    return (
                      <>
                        <p style={{ fontWeight: "600" }}>Photos</p>
                        {/* event.image is the single Cloudinary URL set by
                            CreateEvent.jsx's image upload (existingImageUrl /
                            payload.append("image", ...)). */}
                        <div style={mediaContainerStyle}>
                          {hasPhoto ? (
                            <img
                              src={event.image}
                              alt={event?.title || "Event photo"}
                              style={mediaElementStyle}
                            />
                          ) : (
                            <EmptyMediaIcon />
                          )}
                        </div>

                        <p style={{ fontWeight: "600", marginTop: "30px" }}>
                          Videos
                        </p>
                        {/* event.videoLinks is the array CreateEvent.jsx
                            builds up via handleAddVideoLink and sends as
                            payload.append("videoLinks", JSON.stringify(...)).
                            Native <video controls> is used per link so
                            play/pause/volume/seek all keep working. */}
                        <div style={mediaContainerStyle}>
                          {hasVideo ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px",
                                width: "100%",
                                alignItems: "center",
                                padding: "16px 0",
                              }}
                            >
                              {event.videoLinks.map((link, index) => (
                                <video
                                  key={`${link}-${index}`}
                                  src={link}
                                  controls
                                  style={mediaElementStyle}
                                />
                              ))}
                            </div>
                          ) : (
                            <EmptyMediaIcon />
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewEvent;