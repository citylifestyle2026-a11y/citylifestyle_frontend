import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import '../assets/CSS/Booking.css';
import CreateBookingModal from "../Components/CreateBookingModal";
import ResendTicketModal from "../Components/ResendTicketModal";
import DeleteBookingModal from "../Components/DeleteBookingModal";
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { exportBookingReport, getAllBookings } from "../redux/booking/bookingThunk";
import { getAllEvents } from "../redux/event/eventThunk";
import { FaSort } from "react-icons/fa";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonPagination from "../Components/CommonPagination";
import CommonExportButton from "../Components/CommonExportButton";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonListLayout from "../Components/CommonListLayout";
import CommonLoader from "../Components/CommonLoader";
import CommonEmptyState from "../Components/CommonEmptyState";

// Formats a createdAt value as "DD-MM-YYYY, <local time>" for the "Created
// By" column. Returns "-" for missing/invalid values so nothing renders as
// "Invalid Date".
const formatCreatedAt = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}, ${d.toLocaleTimeString()}`;
};

const columns = ["ID", "Name", "Mobile Number", "Event", "Ticket", "Qty", "Amount", "Created By"];

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific options.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

// Options for the booking "Status" filter select — same static list the
// page rendered inline before.
const BOOKING_STATUS_OPTIONS = [
  { value: "Success", label: "Success" },
  { value: "Deleted", label: "Deleted" },
];

const defaultFilters = {
  bookingId: "",
  mobileNumber: "",
  name: "",
  eventId: "",
  status: "Success",
  fromDate: "",
  toDate: "",
  search: "",
};

const Booking = () => {
  const dispatch = useDispatch();
  const {
    bookings,
    listLoading,
    listError,
    total,
    totalPages,
  } = useSelector((state) => state.booking);

  // date
  const [showDate, setShowDate] = useState(false);

  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    },
  ]);
  const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionMenuPos, setActionMenuPos] = useState(null);
  // Anchors outside-click detection to whichever row's action
  // button+menu is currently open — only ever attached to one wrapper
  // at a time, since only one menu can be open.
  const actionRef = useRef(null);
  const actionMenuRef = useRef(null);
  // Tracks which row's menu (if any) was opened by a CLICK, as opposed to
  // just a hover. A pinned menu stays open when the mouse leaves the row
  // and is only closed by: clicking its button again, clicking outside,
  // Escape, or scroll/resize. A hover-only menu closes as soon as the
  // mouse leaves the row. This lets hover and click share the single
  // openActionId/actionMenuPos state below instead of needing two
  // separate dropdown implementations.
  const pinnedActionIdRef = useRef(null);
  const [activePage, setActivePage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { events } = useSelector((state) => state.event);
  // `filters` is the draft form state bound to the inputs — updates on
  // every keystroke but does NOT by itself trigger a fetch.
  // `appliedFilters` is what's actually sent to the API — only updated by
  // an explicit Search/Reset (or, for the toolbar quick-search, after a
  // short debounce), so typing in Booking Id/Mobile/Name no longer fires
  // a request on every keystroke.
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  // Single source of truth for fetching the list: every handler below only
  // updates state (activePage / rowsPerPage / appliedFilters); this effect
  // is the only place that dispatches getAllBookings, so no handler needs
  // to (and none now does) dispatch it directly — avoiding duplicate calls.
  useEffect(() => {
    dispatch(
      getAllBookings({
        page: activePage,
        limit: rowsPerPage,
        ...appliedFilters,
      })
    );
  }, [dispatch, activePage, rowsPerPage, appliedFilters]);
  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };
  // Select-type filters (Event, Status) apply immediately on selection —
  // unlike the text inputs above, there's no "typing" concern here, so
  // there's no reason to make the user click Search separately just to
  // see the filtered data. Cancels any pending debounced toolbar search
  // so a stale request can't fire moments later, same as handleSearch.
  const handleImmediateFilterChange = (field) => (e) => {
    const value = e.target.value;
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    setFilters((prev) => ({ ...prev, [field]: value }));
    setAppliedFilters((prev) => ({ ...prev, [field]: value }));
    setActivePage(1);
  };
  // Skips the very first run of the toolbar-search debounce effect (mount)
  // and any run caused by handleReset clearing filters.search, since Reset
  // already applies its own fetch via appliedFilters.
  const skipToolbarSearchEffectRef = useRef(true);
  // Lets handleSearch/handleReset cancel a pending debounced search so a
  // stale duplicate request can't fire shortly after an explicit
  // Search/Reset click.
  const searchDebounceTimerRef = useRef(null);
  // Toolbar "Search..." box — debounced so it doesn't fire a request on
  // every keystroke, and always resets to page 1 like the main Search
  // button.
  useEffect(() => {
    if (skipToolbarSearchEffectRef.current) {
      skipToolbarSearchEffectRef.current = false;
      return;
    }
    searchDebounceTimerRef.current = setTimeout(() => {
      setActivePage(1);
      setAppliedFilters((prev) => ({ ...prev, search: filters.search }));
    }, 400);
    return () => clearTimeout(searchDebounceTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);
  // events
  useEffect(() => {
    dispatch(
      getAllEvents({
        page: 1,
        limit: 1000,
        search: "",
      })
    );
  }, [dispatch]);
  const bookingRows = bookings || [];
  const totalQty = bookingRows.reduce(
    (total, booking) => total + Number(booking.quantity || 0),
    0
  );

  const totalAmount = bookingRows.reduce(
    (total, booking) => total + Number(booking.amount || 0),
    0
  );
  // Human-readable error message — never render the raw error value
  // directly in JSX since it could be an object depending on how the
  // API/thunk fails.
  const listErrorMessage =
    typeof listError === "string"
      ? listError
      : listError
        ? "Failed to load bookings. Please try again."
        : "";
  // Shared fallback for any table cell that could come back as
  // undefined/null/NaN/"" from the API — renders "-" instead of leaking
  // those raw values into the UI.
  const safeCell = (value) => {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "number" && Number.isNaN(value)) return "-";
    return value;
  };
  // Computes the fixed-viewport position for a row's menu from its
  // trigger element's rect. Shared by hover and click so both open the
  // menu the exact same way — no duplicate positioning logic.
  const computeActionMenuPos = (triggerEl) => {
    const rect = triggerEl.getBoundingClientRect();
    const estimatedMenuHeight = 190; // approx height for 4 menu items
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight;

    return {
      top: openUpward ? rect.top : rect.bottom,
      right: window.innerWidth - rect.right,
      openUpward,
    };
  };

  const openActionMenu = (id, triggerEl) => {
    setActionMenuPos(computeActionMenuPos(triggerEl));
    setOpenActionId(id);
  };

  const closeActionMenu = () => {
    setOpenActionId(null);
    setActionMenuPos(null);
    pinnedActionIdRef.current = null;
  };

  const toggleActionMenu = (id, event) => {
    if (openActionId === id) {
      // If the row is already open because it was hovered, clicking it
      // should pin the menu open instead of immediately closing it.
      if (pinnedActionIdRef.current === id) {
        closeActionMenu();
      } else {
        pinnedActionIdRef.current = id;
        openActionMenu(id, event.currentTarget);
      }
      return;
    }

    pinnedActionIdRef.current = id;
    openActionMenu(id, event.currentTarget);
  };

  // Hover only opens/previews a menu; it never steals a menu the user
  // has pinned open by clicking on a *different* row.
  const handleActionMouseEnter = (id, event) => {
    if (pinnedActionIdRef.current && pinnedActionIdRef.current !== id) return;
    openActionMenu(id, event.currentTarget);
  };

  // Hover-only menus close on mouse leave; a click-pinned menu stays
  // open until an explicit close (button click, outside click, Escape,
  // scroll/resize) per the required click behavior.
  const handleActionMouseLeave = (id, event) => {
    if (pinnedActionIdRef.current === id) return;
    const relatedTarget = event.relatedTarget || document.elementFromPoint(event.clientX, event.clientY);
    if (
      actionRef.current &&
      actionMenuRef.current &&
      (actionRef.current.contains(relatedTarget) || actionMenuRef.current.contains(relatedTarget))
    ) {
      return;
    }
    if (openActionId === id) {
      setOpenActionId(null);
      setActionMenuPos(null);
    }
  };

  // Closes the open Action menu on: scrolling/resizing (stored
  // coordinates are viewport-relative so they'd go stale), a click
  // outside the open row's button+menu, or Escape. All four listeners
  // are only attached while a menu is actually open, and all four are
  // torn down together — no duplicate listeners, no leaks.
  useEffect(() => {
    if (openActionId === null) return;

    const closeMenu = () => {
      closeActionMenu();
    };

    const handleOutsideClick = (event) => {
      // Click was on the open row's button or inside its menu — let
      // that element's own onClick handle open/close instead, so this
      // listener doesn't fight with the button's toggle.
      if (actionRef.current && actionRef.current.contains(event.target)) {
        return;
      }
      if (actionMenuRef.current && actionMenuRef.current.contains(event.target)) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionId]);
  // handel search
  const handleSearch = () => {
    // Cancel a pending debounced toolbar search so it can't fire again
    // moments later with a now-stale value.
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    setAppliedFilters(filters);
    setActivePage(1);
  };
  // handel reset
  const handleReset = () => {
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    // Clearing filters.search below would otherwise re-trigger the
    // debounced search effect and fire a second, redundant request.
    skipToolbarSearchEffectRef.current = true;

    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);

    setRange([
      {
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      },
    ]);

    setActivePage(1);
  };
  // search
  const handleSearchChange = (e) => {
    const value = e.target.value;

    setFilters((prev) => ({
      ...prev,
      search: value,
    }));
  };
  // fetch bokings — used to refresh the list after actions that don't
  // change activePage/rowsPerPage/appliedFilters (e.g. after creating or
  // deleting a booking), so the automatic effect above wouldn't refire on
  // its own.
  const fetchBookings = () => {
    dispatch(
      getAllBookings({
        page: activePage,
        limit: rowsPerPage,
        ...appliedFilters,
      })
    );
  };
  // pagination
  const startIndex =
    total === 0 ? 0 : (activePage - 1) * rowsPerPage;

  const endIndex = Math.min(
    activePage * rowsPerPage,
    total
  );
  const goToPreviousPage = () => {
    if (activePage > 1) {
      setActivePage((prev) => prev - 1);
    }
  };
  const goToNextPage = () => {
    if (activePage < totalPages) {
      setActivePage((prev) => prev + 1);
    }
  };
  // If filtering/search shrinks the result set so the current page no
  // longer exists, automatically fall back to the last valid page. This
  // just corrects activePage — the fetch effect above then refetches with
  // the corrected page on its own, so no direct dispatch is needed here.
  useEffect(() => {
    if (listLoading) return;
    if (total === 0) return;
    if (totalPages > 0 && activePage > totalPages) {
      setActivePage(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, total]);
  // export booking
  const exportLoading = useSelector(
    (state) => state.booking.exportLoading
  );
  const handleExport = () => {
    const params = {
      bookingId: appliedFilters.bookingId || "",
      mobileNumber: appliedFilters.mobileNumber || "",
      name: appliedFilters.name || "",
      eventId: appliedFilters.eventId || "",
      status: appliedFilters.status || "",
      fromDate: appliedFilters.fromDate || "",
      toDate: appliedFilters.toDate || "",
      search: appliedFilters.search || "",
    };

    dispatch(exportBookingReport(params));
  };
  return (
    <CommonListLayout
      pageClassName="bookingPage-wrapper"
      mainAreaClassName="bookingPageMainArea"
      contentClassName="bookingPageContent"
      headerTitle="Booking"
    >
      <CommonPageHeader
        containerClassName="bookingPage-header"
        leftWrapperClassName="bookingPage-headerLeft"
        title="Booking"
        titleClassName="bookingPage-title"
        breadcrumb={
          <div className="bookingPage-breadcrumb">
            <Link to="/dashboard"><span style={{color:"#9a9ca8"}}>Dashboard</span></Link>
            <span className="bookingPage-breadcrumbSep">-</span>
            <span className="bookingPage-breadcrumbActive">Booking</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="bookingPage-createBtn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span className="bookingPage-createBtnIcon">+</span> Create Booking
          </button>
        }
      />
      {/* booking filter */}
            <div className="bookingPage-filterCard">
              <div className="bookingPage-filterGrid">

                {/* Booking Id */}
                <input
                  type="text"
                  className="bookingPage-filterInput"
                  placeholder="Booking Id"
                  value={filters.bookingId}
                  onChange={handleFilterChange("bookingId")}
                />

                {/* Mobile Number */}
                <input
                  type="text"
                  className="bookingPage-filterInput"
                  placeholder="Mobile Number"
                  value={filters.mobileNumber}
                  onChange={handleFilterChange("mobileNumber")}
                />

                {/* Name */}
                <input
                  type="text"
                  className="bookingPage-filterInput"
                  placeholder="Name"
                  value={filters.name}
                  onChange={handleFilterChange("name")}
                />

                {/* Event */}
                <CommonSelect
                  className="bookingPage-filterSelect"
                  value={filters.eventId}
                  onChange={handleImmediateFilterChange("eventId")}
                  placeholder="All Events"
                  options={events
                    ?.filter((event) => event.isActive === true)
                    .map((event) => ({
                      value: event._id,
                      label: event.title,
                    }))}
                />

                {/* Date Range */}
                <div className="bookingPage-dateWrap">

                  <input
                    type="text"
                    readOnly
                    className="bookingPage-filterInput"
                    value={`${format(
                      range[0].startDate,
                      "yyyy/MM/dd"
                    )} - ${format(
                      range[0].endDate,
                      "yyyy/MM/dd"
                    )}`}
                    onClick={() => setShowDate(true)}
                  />

                  {showDate && (
                    <>
                      <div
                        className="bookingPage-dateOverlay"
                        onClick={() => setShowDate(false)}
                      />

                      <div className="bookingPage-datePopup">

                        <DateRange
                          ranges={range}
                          onChange={(item) =>
                            setRange([item.selection])
                          }
                          months={2}
                          direction="horizontal"
                          showDateDisplay={false}
                          rangeColors={["#2563eb"]}
                        />

                        <div className="bookingPage-dateFooter">

                          <button
                            type="button"
                            className="cancelBtn"
                            onClick={() => setShowDate(false)}
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            className="applyBtn"
                            onClick={() => {
                              setFilters((prev) => ({
                                ...prev,
                                fromDate: format(
                                  range[0].startDate,
                                  "yyyy-MM-dd"
                                ),
                                toDate: format(
                                  range[0].endDate,
                                  "yyyy-MM-dd"
                                ),
                              }));

                              setShowDate(false);
                            }}
                          >
                            Apply
                          </button>

                        </div>

                      </div>
                    </>
                  )}

                </div>

                {/* Status */}
                <CommonSelect
                  className="bookingPage-filterSelect bookingPage-statusSelect"
                  value={filters.status}
                  onChange={handleImmediateFilterChange("status")}
                  options={BOOKING_STATUS_OPTIONS}
                />

              </div>

              <div className="bookingPage-filterActions">

                <button
                  type="button"
                  className="bookingPage-searchBtn"
                  onClick={handleSearch}
                >
                  Search
                </button>

                <button
                  type="button"
                  className="bookingPage-resetBtn"
                  onClick={handleReset}
                >
                  Reset
                </button>

              </div>
            </div>

            <div className="bookingPage-card">
              <div className="erPage__tableToolbar">
                <div className="erPage__toolbarLeft">
                  <CommonSelect
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setActivePage(1);
                    }}
                    className="erPage__pageSizeSelect"
                    options={ROWS_PER_PAGE_OPTIONS}
                  />

                  <div className="erPage__toolbarCenter">
                    <CommonSearch
                      containerClassName="erPage__searchBox"
                      inputClassName="eventList__searchInput"
                      icon={
                        <svg
                          className="erPage__searchIcon"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      }
                      type="search"
                      value={filters.search}
                      onChange={handleSearchChange}
                      placeholder="Search..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="erPage__toolbarRight">
                  <CommonExportButton
                    onClick={handleExport}
                    loading={exportLoading}
                    disabled={exportLoading || total === 0}
                    label="Export Booking"
                  />
                </div>
              </div>
              {/* // tabal */}
              <div className="bookingPage-tableWrap">
                <table className="bookingPage-table">
                  <thead>
                    <tr>
                      <th className="bookingPage-hashCol">#</th>
                      {columns.map((col) => (
                        <th key={col}>
                          <span className="bookingPage-thContent">
                            <span className="bookingPage-sortIcon"><FaSort/></span>
                            {col}
                          </span>
                        </th>
                      ))}
                      <th className="bookingPage-actionCol">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listLoading ? (
                      <tr>
                        <td colSpan={10} className="bookingPage-stateCell">
                          <CommonLoader
                            wrapperClassName="bookingPage-stateWrap"
                            messageClassName="bookingPage-stateText"
                            message="Loading bookings..."
                          />
                        </td>
                      </tr>
                    ) : listErrorMessage ? (
                      <tr>
                        <td colSpan={10} className="bookingPage-stateCell">
                          <div className="bookingPage-stateWrap">
                            <p className="bookingPage-stateText bookingPage-stateText--error">
                              {listErrorMessage}
                            </p>
                            <button
                              type="button"
                              className="bookingPage-stateRetryBtn"
                              onClick={fetchBookings}
                            >
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : bookingRows.length > 0 ? (
                      bookingRows.map((row, index) => (
                        <tr key={row._id}>
                          <td className="bookingPage-hashCol">
                            {(activePage - 1) * rowsPerPage + index + 1}
                          </td>
                          <td>{safeCell(row.bookingNumber)}</td>
                          <td>{safeCell(row.name)}</td>
                          <td>{safeCell(row.mobileNumber)}</td>
                          <td>{safeCell(row.eventId?.title)}</td>
                          <td>{safeCell(row.ticketTypeId?.ticketName)}</td>
                          <td>{safeCell(row.quantity)}</td>
                          <td>{safeCell(row.amount)}</td>
                          <td>
                            <div>{safeCell(row.createdBy?.name)}</div>
                            <div
                              className="bookingPage-createdAt"
                              style={{ fontSize: "12px", color: "#8b91a3", marginTop: "2px" }}
                            >
                              {formatCreatedAt(row.createdAt)}
                            </div>
                          </td>

                          <td>
                            <div
                              className="bookingPage-actionDropdownWrap"
                              ref={openActionId === row._id ? actionRef : null}
                              onMouseEnter={(event) => handleActionMouseEnter(row._id, event)}
                              onMouseLeave={(event) => handleActionMouseLeave(row._id, event)}
                            >
                              <button
                                type="button"
                                className="bookingPage-actionBtn"
                                onClick={(event) => toggleActionMenu(row._id, event)}
                              >
                                Action <span className="bookingPage-actionCaret">&#9662;</span>
                              </button>

                              {openActionId === row._id && actionMenuPos && (
                                <div
                                  className="bookingPage-actionMenu"
                                  ref={actionMenuRef}
                                  style={{
                                    position: "fixed",
                                    top: actionMenuPos.openUpward
                                      ? undefined
                                      : actionMenuPos.top + 4,
                                    bottom: actionMenuPos.openUpward
                                      ? window.innerHeight - actionMenuPos.top + 4
                                      : undefined,
                                    right: actionMenuPos.right,
                                    left: "auto",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="bookingPage-actionMenuItem"
                                    onClick={() => {
                                      closeActionMenu();
                                      navigate(`/view-booking/${row._id}`);
                                    }}
                                  >
                                    View Booking
                                  </button>

                                  <button
                                    type="button"
                                    className="bookingPage-actionMenuItem"
                                    onClick={() => {
                                      closeActionMenu();
                                      window.open(`/register-users/${row._id}`, "_blank");
                                    }}
                                  >
                                    Register Users
                                  </button>

                                  <button
                                    type="button"
                                    className="bookingPage-actionMenuItem"
                                    onClick={() => {
                                      closeActionMenu();
                                      setResendTarget(row._id);
                                    }}
                                  >
                                    Resend Ticket
                                  </button>

                                  <button
                                    type="button"
                                    className="bookingPage-actionMenuItem"
                                    onClick={() => {
                                      closeActionMenu();
                                      setDeleteTarget({
                                        id: row._id,
                                        name: row.name,
                                        mobileNumber: row.mobileNumber,
                                        bookingNumber: row.bookingNumber,
                                      });
                                    }}
                                  >
                                    Delete Booking
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="bookingPage-stateCell">
                          <CommonEmptyState
                            wrapperClassName="bookingPage-stateWrap"
                            textClassName="bookingPage-stateText"
                            message="No Bookings Found."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5}></td>
                      <td className="bookingPage-totalLabel">Total</td>
                      <td className="bookingPage-totalValue">{totalQty}</td>
                      <td className="bookingPage-totalValue">Rs. {totalAmount}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* booking page pagination */}
              <CommonPagination
                currentPage={activePage}
                totalPages={totalPages}
                rangeStart={total === 0 ? 0 : startIndex + 1}
                rangeEnd={endIndex}
                totalItems={total}
                showControls={totalPages > 1}
                onPageSelect={(page) => setActivePage(page)}
                onPrevious={goToPreviousPage}
                onNext={goToNextPage}
                prevDisabled={activePage === 1}
                nextDisabled={activePage === totalPages}
              />
            </div>

            {/* <div className="bookingPage-siteFooter">
              <span>2026 &copy; Keenthemes</span>
              <div className="bookingPage-siteFooterLinks">
                <span>About</span>
                <span>Support</span>
                <span>Purchase</span>
              </div>
            </div> */}

            {isCreateModalOpen && (
              <div
                tabIndex={-1}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsCreateModalOpen(false);
                  }
                }}
              >
                <CreateBookingModal onSuccess={fetchBookings} onClose={() => setIsCreateModalOpen(false)} />
              </div>
            )}

            {resendTarget && (
              <div
                tabIndex={-1}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setResendTarget(null);
                  }
                }}
              >
                <ResendTicketModal
                  bookingId={resendTarget}
                  onClose={() => setResendTarget(null)}
                />
              </div>
            )}
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
                <DeleteBookingModal
                  bookingId={deleteTarget.id}
                  userName={deleteTarget.name}
                  mobileNumber={deleteTarget.mobileNumber}
                  bookingNumber={deleteTarget.bookingNumber}
                  onSuccess={fetchBookings}
                  onClose={() => setDeleteTarget(null)}
                />
              </div>
            )}
    </CommonListLayout>
  );
};

export default Booking;