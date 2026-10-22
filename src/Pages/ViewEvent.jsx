import { useState, useEffect } from "react";
import { EmptyStateIcon } from "../Components/CommonEmptyState";
import { Link, useNavigate } from "react-router-dom";
import "../assets/CSS/ViewEvent.css";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getEventById } from "../redux/event/eventThunk";
import DOMPurify from "dompurify";
import { formatDate, formatDateTime } from "../utilits/dateFormat";

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
// uses the shared "no data" icon (CommonEmptyState).
const EmptyMediaIcon = () => <EmptyStateIcon />;

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
    <div className="Event__page appPage">
      <Sidebar />
      <div className="EventPage__mainArea appMain">
        <Header title="View Event" />
        <div className="viewEvent-wrapper appContent">
          <div className="viewEvent-header">
            <h1 className="viewEvent-title appPageTitle">View Event Details</h1>
            <div className="viewEvent-breadcrumb">
              <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
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