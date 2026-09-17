import {
  useState, useRef, useEffect, useCallback, useMemo
} from "react";
import { FaSearch, FaChevronDown, FaPlus } from "react-icons/fa";
import CreateUserModal from "../Components/CreateUserModal";
import DeleteUserModal from "../Components/DeleteUserModal";
import CommonTable from "../Components/CommonTable";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonPagination from "../Components/CommonPagination";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonListLayout from "../Components/CommonListLayout";
import "../assets/CSS/User.css";
import { useDispatch, useSelector } from "react-redux";
import { deleteUser, getUsers } from '../redux/user/userThunk';
import { showError, showSuccess } from "../utilits/toast";
import { clearUserState } from "../redux/user/userSlice";
const LOGO_AVATAR = "https://ui-avatars.com/api/?name=SA&background=17a2b8&color=fff&bold=true";

// Options for the "rows per page" select. Lives in the page (not inside
// CommonSelect) since CommonSelect must never hardcode page-specific options.
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({
  value: n,
  label: String(n),
}));

export default function User() {
  const dispatch = useDispatch();
  const [activePage, setActivePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { users, loading, error, pagination } = useSelector(
    (state) => state.user
  );
  // searchTerm tracks the raw input value; search is the debounced value
  // actually sent to the API. Previously there was only searchTerm, and it
  // was used directly as the getUsers dependency — firing a request on
  // every keystroke instead of after the user pauses typing, unlike the
  // debounced pattern already used in Event.jsx/TicketType.jsx.
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tracks which row's Action dropdown is currently open
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Tracks whether the modal is in "create" or "edit" mode
  const [modalMode, setModalMode] = useState("create");

  // Holds the user data selected for editing
  const [selectedUser, setSelectedUser] = useState(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUserName, setDeleteUserName] = useState("");
  const [deleteUserId, setDeleteUserId] = useState(null);
  const currentPage = activePage;
  const totalPages = pagination?.totalPages || 1;
  const totalEntries = pagination?.total || 0;
  const limit = pagination?.limit || rowsPerPage;

  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * limit;
  const endIndex = Math.min(currentPage * limit, totalEntries);

  // Debounce the search input before it affects the API call / page reset.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setActivePage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // fetch user
  useEffect(() => {
    dispatch(
      getUsers({
        page: activePage,
        limit: rowsPerPage,
        search,
      })
    );
  }, [dispatch, activePage, rowsPerPage, search]);
  // Ref for detecting outside clicks to close the action dropdown
  const actionMenuRef = useRef(null);
  // action drpdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  // Wrapped in useCallback (stable identity, empty deps — this only calls
  // the setState updater form, which never changes) so it doesn't force
  // userTableColumns/CommonTable to recompute/re-render on every render.
  const handleToggleActionMenu = useCallback((userId) => {
    setOpenActionMenuId((prev) => (prev === userId ? null : userId));
  }, []);
  // pagination
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setActivePage(currentPage - 1);
    }
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setActivePage(currentPage + 1);
    }
  };

  // Wrapped in useCallback for the same reason as handleToggleActionMenu
  // above — only calls stable setState updaters, so an empty dep array is
  // correct and keeps this handler's identity stable across renders.
  const handleEditClick = useCallback((user) => {
    setSelectedUser(user);
    setModalMode("edit");
    setIsModalOpen(true);
    setOpenActionMenuId(null);
  }, []);

  // Same as above.
  const handleDeleteClick = useCallback((user) => {
    setDeleteUserId(user._id);
    setDeleteUserName(user.name);
    setIsDeleteModalOpen(true);
    setOpenActionMenuId(null);
  }, []);

  const handleCreateClick = () => {
    setSelectedUser(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setModalMode("create");
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteUserName("");
  };
  // delete user
  const handleDeleteConfirm = async () => {
    try {
      const res = await dispatch(deleteUser(deleteUserId)).unwrap();

      showSuccess(res.message);

      // Refetch so the deactivated user disappears from the list
      // immediately, using the list's current page/limit/search rather
      // than resetting them.
      dispatch(
        getUsers({
          page: activePage,
          limit: rowsPerPage,
          search,
        })
      );

      dispatch(clearUserState());

      handleCloseDeleteModal();
    } catch (err) {
      showError(err.message || "Failed to delete user");
    }
  };

  // Column configuration passed to CommonTable. This mirrors exactly what
  // the previous inline <table> markup rendered for each column — only the
  // markup has moved, the cell content/handlers/refs are unchanged.
  //
  // Wrapped in useMemo (deps: only the values these render functions
  // actually close over) so CommonTable — which can render up to a full
  // page of rows — doesn't rebuild this array and re-render on every
  // keystroke of the search box before the debounce fires. It still
  // recomputes whenever openActionMenuId changes, since the Action
  // column's render output depends on it.
  const userTableColumns = useMemo(() => [
    {
      key: "image",
      label: "Image",
      sortable: false,
      render: (user) => (
        <img
          src={
            user.profileImage ||
            `${LOGO_AVATAR}&name=${encodeURIComponent(user.name)}`
          }
          alt={user.name}
          className="userPage__avatar"
        />
      ),
    },
    {
      key: "name",
      label: "Name",
      cellClassName: "userPage__userName",
      render: (user) => user.name,
    },
    {
      key: "email",
      label: "Email",
      render: (user) => user.email || "-",
    },
    {
      key: "mobile",
      label: "Mobile No",
      render: (user) => user.mobile,
    },
    {
      key: "role",
      label: "Role",
      render: (user) => user.role,
    },
    {
      key: "createdBy",
      label: "Created By",
      // `createdBy` is populated by the backend (User.service.js getUsers
      // -> .populate("createdBy", "name")) with the Admin who created the
      // user. Falls back to "-" for users created before this field
      // existed, or if population ever comes back empty for any reason,
      // so the table never shows "undefined"/blank.
      render: (user) => user.createdBy?.name || "-",
    },
    {
      key: "created",
      label: "Created",
      render: (user) =>
        new Date(user.createdAt)
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
    {
      key: "action",
      label: "Action",
      sortable: false,
      cellStyle: { position: "relative" },
      render: (user) => (
        <div
          className="userAction__wrapper"
          ref={openActionMenuId === user._id ? actionMenuRef : null}
        >
          <button
            type="button"
            className="userAction__button"
            onClick={() => handleToggleActionMenu(user._id)}
          >
            Action
            <FaChevronDown className="userAction__icon" />
          </button>

          <div
            className={`userAction__menu ${openActionMenuId === user._id ? "userAction__menuOpen" : ""
              }`}
          >
            <button
              type="button"
              className="userAction__item userAction__itemEdit"
              onClick={() => handleEditClick(user)}
            >
              Edit
            </button>

            <button
              type="button"
              className="userAction__item userAction__itemDelete"
              onClick={() => handleDeleteClick(user)}
            >
              Delete
            </button>
          </div>
        </div>
      ),
    },
  ], [openActionMenuId, handleToggleActionMenu, handleEditClick, handleDeleteClick]);

  return (
    <CommonListLayout
      pageClassName="userPage__page"
      mainAreaClassName="userPage__mainArea"
      contentClassName="userPage__content"
      headerTitle="User"
      outsideMainArea={
        <>
          {isModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseModal();
                }
              }}
            >
              <CreateUserModal
                onClose={handleCloseModal}
                isEditMode={modalMode === "edit"}
                editUserData={selectedUser}
                currentPage={activePage}
                rowsPerPage={rowsPerPage}
                search={search}
              />
            </div>
          )}

          {isDeleteModalOpen && (
            <div
              tabIndex={-1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCloseDeleteModal();
                }
              }}
            >
              <DeleteUserModal
                onClose={handleCloseDeleteModal}
                userName={deleteUserName}
                onDelete={handleDeleteConfirm}
              />
            </div>
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="userPage__topRow"
        title="User"
        titleClassName="userPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="userPage__breadcrumb">
            <span>Dashboard</span>
            <span>-</span>
            <span className="userPage__breadcrumbActive">User</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="userPage__createButton"
            onClick={handleCreateClick}
          >
            <FaPlus />
            Create User
          </button>
        }
      />

      <div className="userPage__tableCard">
        <div className="userPage__tableControls">
          <CommonSelect
            className="userPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setActivePage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="userPage__searchBox"
            inputClassName="userPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          />
        </div>

        <div className="userPage__tableWrapper">
          <CommonTable
            columns={userTableColumns}
            data={users}
            rowKey="_id"
            loading={loading}
            loadingMessage="Loading users..."
            error={error}
            errorMessage="Failed to load users."
            emptyMessage="No users found."
            tableClassName="userPage__table"
            thContentClassName="userPage__thContent"
            sortIconClassName="userPage__sortIcon"
          />
        </div>
        {/* pagination */}
        <CommonPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={totalEntries === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={totalEntries}
          showControls={totalEntries > rowsPerPage}
          onPageSelect={(page) => setActivePage(page)}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === totalPages}
        />
      </div>
    </CommonListLayout>
  );
}