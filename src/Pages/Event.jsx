import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "../assets/CSS/Event.css";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaSort } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { getAllEvents, changeEventStatus } from "../redux/event/eventThunk";
import Swal from "sweetalert2";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonPagination from "../Components/CommonPagination";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonListLayout from "../Components/CommonListLayout";
import CommonLoader from "../Components/CommonLoader";
import CommonEmptyState from "../Components/CommonEmptyState";
import DeleteEventModal from "../Components/DeleteEventModal";

const columns = [
  { key: "title", label: "Title" },
  { key: "startDateTime", label: "Start Date & Time" },
  { key: "endDateTime", label: "End Date & Time" },
  { key: "venueName", label: "Venue Name" },
  { key: "createdBy", label: "Created By" },
  { key: "isActive", label: "Is Active" },
  { key: "createdOn", label: "Created On" },
];

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific options.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: String(n),
  label: String(n),
}));

// DD-MM-YYYY — used for "Created On", and reused below by formatDateTime so
// the date portion of Start/End Date & Time stays in the exact same format
// instead of duplicating the padding/format logic a second time.
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// DD-MM-YYYY hh:mm AM/PM — for Start/End Date & Time. The API returns raw
// ISO strings (e.g. "2026-09-02T08:51:00.000Z"); this renders them in the
// viewer's local time via the standard Date getters, which is correct here
// since events are stored as proper UTC instants (see CreateEvent.jsx's
// IST-offset fix) — it does not touch or reformat the stored value itself,
// only how it's displayed.
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

// Single source of truth for "has this event's window closed" — compares
// endDateTime against the current time. Reuse this wherever expiry needs
// to be checked or displayed, instead of comparing dates inline, so
// Expired is decided consistently everywhere on the frontend.
const isEventExpired = (event) => {
  if (!event?.endDateTime) return false;
  const endTime = new Date(event.endDateTime).getTime();
  if (Number.isNaN(endTime)) return false;
  return Date.now() >= endTime;
};

const Event = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionMenuPos, setActionMenuPos] = useState(null);
  // Holds { id, title } of the event awaiting admin-credential
  // confirmation (Step 4's secure delete). Null = modal closed.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const {
    events,
    loading,
    total,
    totalPages,
  } = useSelector((state) => state.event);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(
      getAllEvents({
        page: currentPage,
        limit: rowsPerPage,
        search,
      })
    );
  }, [dispatch, currentPage, rowsPerPage, search]);

  // The dropdown is rendered via a portal at a fixed viewport position
  // computed at the moment it's opened (see toggleActionMenu below). If the
  // page or the table's horizontal scroll moves after that, the stored
  // coordinates go stale — closing on scroll/resize is simpler and safer
  // than re-measuring and repositioning a portaled element on every scroll
  // tick. `capture: true` is needed because scroll events don't bubble, so
  // a listener on `window` only sees them for the table's internal
  // horizontal scroll if it's registered on the capture phase.
  useEffect(() => {
    if (openActionId === null) return;

    const closeMenu = () => {
      setOpenActionId(null);
      setActionMenuPos(null);
    };

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openActionId]);

  // pervious page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };
  // pagination
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  // netx page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };
  const toggleActionMenu = (id, e) => {
    if (openActionId === id) {
      setOpenActionId(null);
      setActionMenuPos(null);
      return;
    }

    // Position the (portaled) menu against the button's own bounding box,
    // right-aligned to it — matching how it used to be anchored via
    // `right: 0` on `.eventList__actionWrapper`, just computed in JS now
    // since the menu no longer lives inside that wrapper's DOM subtree.
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenuPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setOpenActionId(id);
  };

  const closeActionMenu = () => {
    setOpenActionId(null);
    setActionMenuPos(null);
  };

  // status changes
  const handleStatusChange = async (event) => {
    // Expired events can never be (re)activated from the frontend — block
    // before the confirm dialog even opens, and don't call the API.
    if (isEventExpired(event)) {
      Swal.fire({
        icon: "warning",
        title: "Event Expired",
        text: "This event has already expired and cannot be activated.",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "Do you want to change the status?",
      showCancelButton: true,
      confirmButtonText: "Yes, Change it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await dispatch(changeEventStatus(event._id)).unwrap();

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Status updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error || "Failed to update status.",
      });
    }
  };

  // delete event
  // Step 4 flow: existing "Are you sure?" confirmation (unchanged) runs
  // first; only on confirm does this open DeleteEventModal, which
  // collects the admin's own email + password and calls the secure
  // DELETE /events/:id/delete API itself. Cancelling the confirmation
  // here takes no action at all, same as before.
  const handleDeleteEvent = async (event) => {
    closeActionMenu();

    const result = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: `Do you want to delete "${event.title}"? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, Delete it!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) return;

    setDeleteTarget({ id: event._id, title: event.title });
  };

  return (

    <CommonListLayout
      pageClassName="Event__page"
      mainAreaClassName="EventPage__mainArea"
      contentClassName="eventList__wrapper"
      headerTitle="Event"
    >
      <CommonPageHeader
        containerClassName="eventList__header"
        leftWrapperClassName="eventList__headerLeft"
        title="Event"
        titleClassName="eventList__title"
        breadcrumb={
          <div className="eventList__breadcrumb">
            <Link to="/dashboard"> <span style={{color:"#9a9ca8"}}>Dashboard</span> </Link>
            <span className="eventList__breadcrumbSep">-</span>
            <span className="eventList__breadcrumbActive">Event</span>
          </div>
        }
        actions={
          <Link to={'/create-event'}>
            <button type="button" className="eventList__createBtn">
              <span className="eventList__createBtnIcon">+</span> Create Event
            </button>
          </Link>
        }
      />

      <div className="eventList__card">
            {openActionId !== null && (
              <div
                className="eventList__actionOverlay"
                onClick={closeActionMenu}
              />
            )}

            <div className="eventList__toolbar">
              <CommonSelect
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                className="eventList__pageSizeSelect"
                options={ROWS_PER_PAGE_OPTIONS}
              />

              <CommonSearch
                containerClassName="eventList__searchBox"
                inputClassName="eventList__searchInput"
                icon={<span className="eventList__searchIcon"><FaSearch /></span>}
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
            </div>

            <div className="eventList__tableWrap">
              <table className="eventList__table">
                <colgroup>
                  <col className="eventList__colHash" />
                  <col className="eventList__colTitle" />
                  <col className="eventList__colStart" />
                  <col className="eventList__colEnd" />
                  <col className="eventList__colVenue" />
                  <col className="eventList__colCreatedBy" />
                  <col className="eventList__colActive" />
                  <col className="eventList__colCreatedOn" />
                  <col className="eventList__colAction" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="eventList__hashCol">#</th>
                    {columns.map((col) => (
                      <th key={col.key}>
                        <span className="eventList__thContent">
                          <span className="eventList__sortIcon"><FaSort /></span>
                          {col.label}
                        </span>
                      </th>
                    ))}
                    <th className="eventList__actionCol">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center" }}>
                        <CommonLoader message="Loading events..." />
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center" }}>
                        <CommonEmptyState
                          wrapperClassName="bookingPage-stateWrap"
                          textClassName="bookingPage-stateText"
                          message="No Events Found."
                        />
                      </td>
                    </tr>
                  ) : events.map((event, index) => (
                    <tr key={event._id}>
                      <td>{index + 1}</td>
                      <td className="eventList__titleCell">{event.title}</td>
                      <td>{formatDateTime(event.startDateTime)}</td>
                      <td>{formatDateTime(event.endDateTime)}</td>
                      <td>{event.venueName}</td>
                      <td>{event.createdBy?.name || "-"}</td>
                      <td>
                        {isEventExpired(event) ? (
                          <span
                            className="eventList__statusExpired"
                            style={{ color: "#dc3545", fontWeight: 600 }}
                          >
                            Expired
                          </span>
                        ) : (
                          <span
                            className={`eventList__toggle ${event.isActive ? "eventList__toggleOn" : ""
                              }`}
                            onClick={() => {
                              handleStatusChange(event);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <span className="eventList__toggleKnob" />
                          </span>
                        )}
                      </td>
                      <td>
                        {formatDate(event.createdAt)}
                      </td>
                      <td className="eventList__actionCol">
                        <div className="eventList__actionWrapper">
                          <button
                            type="button"
                            className="eventList__actionButton"
                            onClick={(e) => toggleActionMenu(event._id, e)}
                          >
                            Action <span className="eventList__actionCaret">&#9662;</span>
                          </button>

                          {openActionId === event._id &&
                            actionMenuPos &&
                            createPortal(
                              <div
                                className="eventList__actionMenu"
                                style={{
                                  top: `${actionMenuPos.top}px`,
                                  right: `${actionMenuPos.right}px`,
                                }}
                              >
                                <Link to={`/view-event/${event._id}`}>
                                  <button
                                    type="button"
                                    className="eventList__actionItem"
                                    onClick={closeActionMenu}
                                  >
                                    View
                                  </button>
                                </Link>
                                <Link
                                  to={`/ticket-type/${event._id}`}
                                  state={{
                                    eventName: event.title,
                                    eventId: event._id,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="eventList__actionItem"
                                    onClick={closeActionMenu}
                                  >
                                    Ticket Type
                                  </button>
                                </Link>
                                <button
                                  type="button"
                                  className="eventList__actionItem"
                                  onClick={() => {
                                    closeActionMenu();
                                    // Reuse the Create Event page for editing —
                                    // no /edit-event/:id or /create-event/:id
                                    // route. CreateEvent.jsx reads
                                    // location.state.eventId to switch into
                                    // edit mode and fetch/populate the form.
                                    navigate("/create-event", {
                                      state: { eventId: event._id },
                                    });
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="eventList__actionItem"
                                  onClick={() => handleDeleteEvent(event)}
                                >
                                  Delete
                                </button>
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  )
                  )}
                </tbody>
              </table>
            </div>

            <CommonPagination
              currentPage={currentPage}
              totalPages={totalPages}
              rangeStart={total === 0 ? 0 : startIndex + 1}
              rangeEnd={endIndex}
              totalItems={total}
              showControls={totalPages > 1}
              onPageSelect={(page) => setCurrentPage(page)}
              onPrevious={goToPreviousPage}
              onNext={goToNextPage}
              prevDisabled={currentPage === 1}
              nextDisabled={currentPage === totalPages}
            />

            {/* <div className="eventList__pagination">
              Show 1 - {filteredEvents.length} of {events.length}
            </div> */}
          </div>

          {/* <div className="eventList__footer">
            <span>2026 &copy; Keenthemes</span>
            <div className="eventList__footerLinks">
              <span>About</span>
              <span>Support</span>
              <span>Purchase</span>
            </div>
          </div> */}

          {deleteTarget && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDeleteTarget(null);
                }
              }}
            >
              <DeleteEventModal
                eventId={deleteTarget.id}
                eventTitle={deleteTarget.title}
                onClose={() => setDeleteTarget(null)}
                onSuccess={() => setDeleteTarget(null)}
              />
            </div>
          )}
    </CommonListLayout>
  );
};

export default Event;