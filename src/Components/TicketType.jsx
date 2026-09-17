import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../assets/CSS/TicketType.css";
import { deleteTicketType, getAllTicketTypes } from "../redux/ticketType/ticketTypeThunk";
import { getEventById } from "../redux/event/eventThunk";
import CreateTicketTypeModal from "./CreateTicketTypeModal";
import { FaChevronLeft, FaChevronRight, FaSearch, FaSort } from "react-icons/fa";
import Swal from "sweetalert2";
import { clearTicketTypeState } from "../redux/ticketType/ticketTypeSlice";

// Shown in place of the table rows when there is no ticket type data to
// display (rows.length === 0) — see the "No ticket types found" branch
// below.
const TicketTypeEmptyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 460 512"
    width="120"
    className="ticketType__emptyIcon"
  >
    <path d="M220.6 130.3l-67.2 28.2V43.2L98.7 233.5l54.7-24.2v130.3l67.2-209.3zm-83.2-96.7l-1.3 4.7-15.2 52.9C80.6 106.7 52 145.8 52 191.5c0 52.3 34.3 95.9 83.4 105.5v53.6C57.5 340.1 0 272.4 0 191.6c0-80.5 59.8-147.2 137.4-158zm311.4 447.2c-11.2 11.2-23.1 12.3-28.6 10.5-5.4-1.8-27.1-19.9-60.4-44.4-33.3-24.6-33.6-35.7-43-56.7-9.4-20.9-30.4-42.6-57.5-52.4l-9.7-14.7c-24.7 16.9-53 26.9-81.3 28.7l2.1-6.6 15.9-49.5c46.5-11.9 80.9-54 80.9-104.2 0-54.5-38.4-102.1-96-107.1V32.3C254.4 37.4 320 106.8 320 191.6c0 33.6-11.2 64.7-29 90.4l14.6 9.6c9.8 27.1 31.5 48 52.4 57.4s32.2 9.7 56.8 43c24.6 33.2 42.7 54.9 44.5 60.3s.7 17.3-10.5 28.5zm-9.9-17.9c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8 8-3.6 8-8z" />
  </svg>
);

const TicketType = () => {
  const dispatch = useDispatch();
  const { eventId } = useParams();
  const location = useLocation();

  const eventName = location.state?.eventName || "";
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);
  // ================= REDUX STATE (GET) =================
  const {
    ticketTypes,
    total,
    totalPages,
    loading,
    error,
  } = useSelector((state) => state.ticketType);
  const [openActionId, setOpenActionId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState(null);

  // ================= EVENT DETAILS (for Allow Dates range restriction) =================
  // Ticket Type only had eventId/eventName before; the modal's calendar needs the
  // Event's actual startDateTime/endDateTime, fetched via the existing getEventById.
  const { event: eventDetails, loading: eventDetailsLoading } = useSelector(
    (state) => state.event
  );

  useEffect(() => {
    if (eventId) {
      dispatch(getEventById(eventId));
    }
  }, [dispatch, eventId]);

  // state.event.event is shared app-wide; guard against a stale, different
  // event's data still being in the store while this one is loading.
  const isCurrentEventLoaded =
    eventDetails && (eventDetails._id === eventId || eventDetails.id === eventId);
  const eventStartDate = isCurrentEventLoaded ? eventDetails.startDateTime : null;
  const eventEndDate = isCurrentEventLoaded ? eventDetails.endDateTime : null;

  // ================= FETCH ON PAGE LOAD =================
  useEffect(() => {
    dispatch(
      getAllTicketTypes({
        eventId,
        page: currentPage,
        limit: rowsPerPage,
        search,
      })
    );
  }, [dispatch, eventId, currentPage, rowsPerPage, search]);
  // paginaion logic
  const pageNumbers = [];

  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const toggleAction = (id) => {
    setOpenActionId((prev) => (prev === id ? null : id));
  };

  // The backend already filters by `search` server-side (see
  // ticketType.service.js). Re-filtering here client-side was redundant
  // and could hide results the backend legitimately returned (e.g. if the
  // backend search ever matches more than just ticketName). Render the
  // server-provided list directly.
  const rows = ticketTypes || [];

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedTicketType(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ticket) => {
    setIsEditMode(true);
    setSelectedTicketType(ticket);
    setIsModalOpen(true);
    setOpenActionId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTicketType(null);
  };

  // delete modal
  const handleDelete = async (ticket) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You want to delete "${ticket.ticketName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
    });

    if (!result.isConfirmed) return;

    try {
      await dispatch(deleteTicketType(ticket._id)).unwrap();

      dispatch(
        getAllTicketTypes({
          eventId,
          page: currentPage,
          limit: rowsPerPage,
          search,
        })
      );

      dispatch(clearTicketTypeState());
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error || "Failed to delete ticket type.",
      });
    }
  };
  return (
    <div className="ticketType__layout">
      <Sidebar />
      <div className="ticketType__main">
        <Header title="Ticket Type" />

        <div className="ticketType__page">
          <div className="ticketType__topRow">
            <div className="ticketType__titleBlock">
              <h1 className="ticketType__title">
                {eventName}
              </h1>
              <div className="ticketType__breadcrumb">
                <Link to="/dashboard">Dashboard</Link>
                <span className="ticketType__breadcrumbSep">-</span>
                <Link to="/ticket-types" className="ticketType__breadcrumbActive">
                  Ticket Type
                </Link>
              </div>
            </div>

            <button
              type="button"
              className="ticketType__createBtn"
              onClick={openCreateModal}
            >
              <span className="ticketType__createBtnIcon">+</span>
              Create Ticket Type
            </button>
          </div>

          <Link to="/event" className="ticketType__backLink">
            <span className="ticketType__backArrow">&#8592;</span> Back Page
          </Link>

          <div className="eventList__card">
            <div className="eventList__toolbar">
              <div>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="eventList__pageSizeSelect"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div className="eventList__searchBox">
                <span className="eventList__searchIcon"><FaSearch /></span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="eventList__searchInput"
                />
              </div>
            </div>

            <div className="ticketType__tableWrapper">
              <table className="ticketType__table">
                <colgroup>
                  <col className="ticketType__colIndex" />
                  <col className="ticketType__colName" />
                  <col className="ticketType__colDayCount" />
                  <col className="ticketType__colAmount" />
                  <col className="ticketType__colDate" />
                  <col className="ticketType__colAvailable" />
                  <col className="ticketType__colCreated" />
                  <col className="ticketType__colAction" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="ticketType__th">#</th>
                    <th className="ticketType__th"> <span className="eventList__sortIcon"><FaSort /></span>Ticket Name</th>
                    <th className="ticketType__th"> <span className="eventList__sortIcon"><FaSort /></span>Allow Day Count</th>
                    <th className="ticketType__th"> <span className="eventList__sortIcon"><FaSort /></span>Amount</th>
                    <th className="ticketType__th"> <span className="eventList__sortIcon"><FaSort /></span>Allow Date</th>
                    <th className="ticketType__th"> <span className="eventList__sortIcon"><FaSort /></span>Available Count</th>
                    <th className="ticketType__th"> <span className="eventList__sortIcon"><FaSort /></span>Created On</th>
                    <th className="ticketType__th ticketType__thAction">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td className="ticketType__td ticketType__emptyRow" colSpan={8}>
                        Loading ticket types...
                      </td>
                    </tr>
                  )}

                  {!loading && error && (
                    <tr>
                      <td className="ticketType__td ticketType__emptyRow" colSpan={8}>
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && !error && rows.map((ticket, index) => (
                    <tr key={ticket._id} className="ticketType__tr">
                      <td className="ticketType__td">{index + 1}</td>
                      <td className="ticketType__td ticketType__tdName">
                        {ticket.ticketName}
                      </td>
                      <td className="ticketType__td">
                        {ticket.allowDayCount}
                      </td>
                      <td className="ticketType__td">{ticket.amount}</td>
                      <td className="ticketType__td ticketType__tdDate">
                        {Array.isArray(ticket.allowDates) && ticket.allowDates.length > 0
                          ? ticket.allowDates
                            .map((date) => new Date(date).toLocaleDateString("en-GB").replace(/\//g, " - "))
                            .join(", ")
                          : "-"}
                      </td>
                      <td className="ticketType__td">
                        {ticket.availableCount}
                      </td>
                      <td className="ticketType__td">
                        {ticket.createdBy?.name || "-"}
                      </td>
                      <td className="ticketType__td ticketType__tdAction">
                        <div className="ticketType__actionDropdown">
                          <button
                            type="button"
                            className="ticketType__actionBtn"
                            onClick={() => toggleAction(ticket._id)}
                          >
                            Action <span className="ticketType__caret">▾</span>
                          </button>

                          {openActionId === ticket._id && (
                            <div className="ticketType__actionMenu">
                              <button
                                type="button"
                                className="ticketType__actionMenuItem"
                                onClick={() => openEditModal(ticket)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ticketType__actionMenuItem ticketType__actionMenuItemDelete"
                                onClick={() => handleDelete(ticket)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loading && !error && rows.length === 0 && (
                    <tr>
                      <td
                        className="ticketType__td ticketType__emptyRow"
                        colSpan={8}
                      >
                        <div
                          className="ticketType__emptyState"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "12px",
                            padding: "16px 0",
                          }}
                        >
                          <TicketTypeEmptyIcon />
                          <span>No ticket types found.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="permissionPagePagination">

              <span className="permissionPagePaginationInfo">
                Show {total === 0 ? 0 : startIndex + 1} - {endIndex} of {total}
              </span>

              {totalPages > 1 && (
                <div className="permissionPagePaginationControls">

                  <button
                    type="button"
                    className="permissionPagePaginationArrow"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <FaChevronLeft />
                  </button>

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`permissionPagePaginationBtn ${currentPage === page
                        ? "permissionPagePaginationActive"
                        : ""
                        }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="permissionPagePaginationArrow"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <FaChevronRight />
                  </button>

                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <CreateTicketTypeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        eventId={eventId}
        eventName={eventName}
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
        eventDatesLoading={eventDetailsLoading}
        isEditMode={isEditMode}
        selectedTicketType={selectedTicketType}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        search={search}
      />
    </div>
  );
};

export default TicketType;