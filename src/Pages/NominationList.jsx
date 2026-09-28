import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaSearch, FaPlus } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonEmptyState from "../Components/CommonEmptyState";
import CommonPagination from "../Components/CommonPagination";
import CreateNominationModal from "../Components/CreateNominationModal";

import { getAllNominations } from "../redux/nomination/nominationThunk";
import { getAllEditions } from "../redux/edition/editionThunk";

import "../assets/CSS/NominationList.css";

// PARV CRM — Phase 2: Nomination list. Same list-page shape as
// Pages/GuestList.jsx. What a viewer sees is entirely decided by the
// backend (services/nomination.service.js RBAC scoping) — a Coordinator
// gets only their own nominations back, an Admin gets everyone's. The
// only thing this page decides itself is whether to show the
// "Add Nomination" button and the Coordinator column, based on role —
// nominating is a Coordinator action (doc section 4); Admin's view here
// is read-only oversight, matching Phase 2 scope (no approve/reject —
// that's Phase 4).

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

export default function NominationList() {
  const dispatch = useDispatch();

  const { nominations, loading, error, total, totalPages, limit } = useSelector(
    (state) => state.nomination
  );
  const { editions } = useSelector((state) => state.edition);

  const profile = useSelector((state) => state.auth.profile);
  const authUser = useSelector((state) => state.auth.user);
  const role = profile?.role ?? authUser?.role;
  const isCoordinator = role === "coordinator";

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editionFilter, setEditionFilter] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const effectiveLimit = limit || rowsPerPage;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * effectiveLimit;
  const endIndex = Math.min(currentPage * effectiveLimit, total);
  const resolvedTotalPages = totalPages || 1;

  useEffect(() => {
    // Populates the edition filter dropdown. All editions (not just
    // Active), since an admin reviewing history may want a closed one.
    dispatch(getAllEditions({ limit: 100, sortBy: "editionNumber", sortOrder: "desc" }));
  }, [dispatch]);

  useEffect(() => {
    const params = { page: currentPage, limit: rowsPerPage };
    if (editionFilter) params.editionId = editionFilter;

    dispatch(getAllNominations(params));
  }, [dispatch, currentPage, rowsPerPage, editionFilter]);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < resolvedTotalPages) setCurrentPage(currentPage + 1);
  };

  const handleCreateClick = () => setIsFormModalOpen(true);
  const handleCloseFormModal = () => setIsFormModalOpen(false);

  const nominationTableColumns = [
    {
      key: "guest",
      label: "Guest",
      sortable: false,
      cellClassName: "nominationPage__contactName",
      render: (nomination) => (
        <span>
          {nomination.guestId?.fullName || "-"}
          {nomination.guestId?.isVip && (
            <span className="nominationPage__vipBadge">VIP</span>
          )}
        </span>
      ),
    },
    {
      key: "mobile",
      label: "Mobile",
      sortable: false,
      render: (nomination) => nomination.guestId?.mobile || "-",
    },
    {
      key: "edition",
      label: "Edition",
      sortable: false,
      render: (nomination) => nomination.editionId?.name || "-",
    },
    // Coordinator column only makes sense for the Admin's "everyone's
    // nominations" view — a Coordinator already knows every row is
    // theirs (RBAC-scoped server-side).
    ...(!isCoordinator
      ? [
          {
            key: "coordinator",
            label: "Coordinator",
            sortable: false,
            render: (nomination) => nomination.coordinatorId?.name || "-",
          },
        ]
      : []),
    {
      key: "matchType",
      label: "Match",
      sortable: false,
      render: (nomination) => (
        <span
          className={`nominationPage__matchBadge nominationPage__match--${nomination.matchType}`}
        >
          {nomination.matchType === "Existing" ? "Existing Guest" : "New Guest"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (nomination) => (
        <span className="nominationPage__statusBadge">{nomination.status}</span>
      ),
    },
    {
      key: "created",
      label: "Nominated On",
      sortable: false,
      render: (nomination) =>
        new Date(nomination.createdAt)
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .replace(",", "")
          .replace(/\//g, "-"),
    },
  ];

  return (
    <CommonListLayout
      pageClassName="nominationPage__page"
      mainAreaClassName="nominationPage__mainArea"
      contentClassName="nominationPage__content"
      headerTitle={isCoordinator ? "My Nominations" : "Nominations"}
      outsideMainArea={
        isFormModalOpen && (
          <div
            tabIndex={-1}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCloseFormModal();
            }}
          >
            <CreateNominationModal
              onClose={handleCloseFormModal}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
            />
          </div>
        )
      }
    >
      <CommonPageHeader
        containerClassName="nominationPage__topRow"
        title={isCoordinator ? "My Nominations" : "Nominations"}
        titleClassName="nominationPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="nominationPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="nominationPage__breadcrumbActive">
              {isCoordinator ? "My Nominations" : "Nominations"}
            </span>
          </div>
        }
        actions={
          isCoordinator && (
            <div className="nominationPage__headerActions">
              <button
                type="button"
                className="nominationPage__createButton"
                onClick={handleCreateClick}
              >
                <FaPlus />
                Add Nomination
              </button>
            </div>
          )
        }
      />

      <div className="nominationPage__tableCard appCard">
        <div className="nominationPage__tableControls">
          <CommonSelect
            className="nominationPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSelect
            className="nominationPage__filterSelect"
            value={editionFilter}
            onChange={(e) => {
              setEditionFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="All Editions"
            options={editions.map((edition) => ({ value: edition._id, label: edition.name }))}
          />
        </div>

        <div className="nominationPage__tableWrapper">
          <CommonTable
            columns={nominationTableColumns}
            data={nominations}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading nominations..."
            error={error}
            errorMessage="Failed to load nominations."
            emptyMessage={
              <CommonEmptyState
                wrapperClassName="nominationPage__stateWrap"
                textClassName="nominationPage__stateText"
                message={
                  isCoordinator
                    ? "You haven't nominated anyone yet."
                    : "No nominations found."
                }
              />
            }
            tableClassName="nominationPage__table"
            thContentClassName="nominationPage__thContent"
            sortIconClassName="nominationPage__sortIcon"
          />
        </div>

        <CommonPagination
          currentPage={currentPage}
          totalPages={resolvedTotalPages}
          rangeStart={total === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={total}
          showControls={total > rowsPerPage}
          onPageSelect={(page) => setCurrentPage(page)}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === resolvedTotalPages}
        />
      </div>
    </CommonListLayout>
  );
}
