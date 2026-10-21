import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaPlus, FaChevronDown, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import DeleteUserModal from "../Components/DeleteUserModal";
import FormLinkModal from "../Components/FormLinkModal";

import {
  getFormLinksApi,
  updateFormLinkApi,
  deleteFormLinkApi,
  buildFormLinkUrl,
} from "../services/formLinkService";
import { formatDate } from "../utilits/dateFormat";
import { copyText } from "../utilits/copyText";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";

// The table, header and search box reuse the Company Category page styles.
import "../assets/CSS/CompanyCategory.css";
import "../assets/CSS/FormLinks.css";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }));

const STATE_LABEL = { active: "Open", full: "Full", closed: "Closed" };

// Only these are sortable on the server (see SORTABLE in formLink.service.js).
const SORTABLE_COLUMNS = ["name", "quantity", "usedCount", "createdAt"];

const whatsappShareUrl = (link) =>
  `https://wa.me/?text=${encodeURIComponent(
    `Please fill this form: ${buildFormLinkUrl(link.token)}`
  )}`;

export default function FormLinks() {
  const [links, setLinks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [refreshKey, setRefreshKey] = useState(0);

  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [formModal, setFormModal] = useState(null); // { link } -> link null = create
  const [deleteLink, setDeleteLink] = useState(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load the list.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getFormLinksApi({
      page: currentPage,
      limit: rowsPerPage,
      search,
      sortBy,
      sortOrder,
    })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || {};
        setLinks(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setListError(false);
      })
      .catch(() => {
        if (!cancelled) setListError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, rowsPerPage, search, sortBy, sortOrder, refreshKey]);

  // Close the Action dropdown on an outside click.
  const actionMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortOrder("asc");
      return field;
    });
    setCurrentPage(1);
  }, []);

  const handleCopy = useCallback(async (link) => {
    setOpenActionMenuId(null);
    const ok = await copyText(buildFormLinkUrl(link.token));
    if (ok) showSuccess("Link copied.");
    else showError("Could not copy. Please try again.");
  }, []);

  const handleToggleStatus = useCallback(
    async (link) => {
      setOpenActionMenuId(null);
      try {
        await updateFormLinkApi(link._id, {
          status: link.status === "closed" ? "active" : "closed",
        });
        showSuccess(link.status === "closed" ? "Link re-opened." : "Link closed.");
        refresh();
      } catch (err) {
        showError(getErrorText(err, "Unable to update the link."));
      }
    },
    [refresh]
  );

  const handleDeleteConfirm = async () => {
    try {
      await deleteFormLinkApi(deleteLink._id);
      showSuccess("Form link deleted.");
      setDeleteLink(null);
      // Deleting the last row of the last page: step back one page.
      if (links.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else refresh();
    } catch (err) {
      showError(getErrorText(err, "Unable to delete the link."));
    }
  };

  const renderSortableHeader = useCallback(
    (label, field) => (
      <span
        className="companyCategoryPage__sortHeader"
        role="button"
        tabIndex={0}
        aria-label={`Sort by ${label}`}
        onClick={() => handleSort(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
      >
        <span
          className={`companyCategoryPage__sortIcon ${
            sortBy === field ? "companyCategoryPage__sortIconActive" : ""
          }`}
        >
          {sortBy === field ? (
            sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />
          ) : (
            <FaSort />
          )}
        </span>
        {label}
      </span>
    ),
    [sortBy, sortOrder, handleSort]
  );

  const columns = useMemo(() => {
    const col = (key, label, extra = {}) => {
      const isSortable = SORTABLE_COLUMNS.includes(key);
      return {
        key,
        label: isSortable ? renderSortableHeader(label, key) : label,
        ...(isSortable ? { sortable: false } : {}),
        ...extra,
      };
    };

    return [
      col("name", "Name (Reference)", {
        cellClassName: "companyCategoryPage__categoryName",
        render: (link) => link.name,
      }),
      col("quantity", "Quantity", { render: (link) => link.quantity }),
      col("usedCount", "Filled", {
        render: (link) => {
          const percent = Math.min(100, Math.round((link.usedCount / link.quantity) * 100));
          return (
            <div className="formLinks__progressWrap">
              <span className="formLinks__cell">
                {link.usedCount} / {link.quantity}
                {link.state === "active" && ` · ${link.remaining} left`}
              </span>
              <div className="formLinks__progress" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        },
      }),
      col("target", "Added to", { sortable: false, render: () => "Guest List + Contact Book" }),
      col("state", "Status", {
        render: (link) => (
          <span className={`formLinks__badge formLinks__badge--${link.state}`}>
            {STATE_LABEL[link.state]}
          </span>
        ),
      }),
      col("createdAt", "Created", { render: (link) => formatDate(link.createdAt) }),
      {
        key: "action",
        label: "Actions",
        sortable: false,
        cellStyle: { position: "relative" },
        render: (link) => (
          <div
            className="companyCategoryAction__wrapper"
            ref={openActionMenuId === link._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="companyCategoryAction__button"
              onClick={() => setOpenActionMenuId((prev) => (prev === link._id ? null : link._id))}
            >
              Action
              <FaChevronDown className="companyCategoryAction__icon" />
            </button>

            <div
              className={`companyCategoryAction__menu formLinks__menu ${
                openActionMenuId === link._id ? "companyCategoryAction__menuOpen" : ""
              }`}
            >
              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleCopy(link)}
              >
                Copy Link
              </button>

              <a
                className="companyCategoryAction__item"
                href={whatsappShareUrl(link)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpenActionMenuId(null)}
              >
                Send on WhatsApp
              </a>

              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setFormModal({ link });
                }}
              >
                Edit
              </button>

              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleToggleStatus(link)}
              >
                {link.status === "closed" ? "Re-open" : "Close"}
              </button>

              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setDeleteLink(link);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      },
    ];
  }, [renderSortableHeader, openActionMenuId, handleCopy, handleToggleStatus]);

  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Form Links"
      outsideMainArea={
        <>
          {formModal && (
            <FormLinkModal
              link={formModal.link}
              onClose={() => setFormModal(null)}
              onSaved={refresh}
            />
          )}

          {deleteLink && (
            <DeleteUserModal
              userName={deleteLink.name}
              entityLabel="form link"
              onClose={() => setDeleteLink(null)}
              onDelete={handleDeleteConfirm}
            />
          )}
        </>
      }
    >
      <CommonPageHeader
        containerClassName="companyCategoryPage__topRow"
        title="Form Links"
        titleClassName="companyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="companyCategoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="companyCategoryPage__breadcrumbActive">Form Links</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="companyCategoryPage__createButton"
            onClick={() => setFormModal({ link: null })}
          >
            <FaPlus />
            Create Form Link
          </button>
        }
      />

      <div className="companyCategoryPage__tableCard appCard">
        <div className="companyCategoryPage__tableControls">
          <CommonSelect
            className="companyCategoryPage__rowsSelect"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
          />

          <CommonSearch
            containerClassName="companyCategoryPage__searchBox"
            inputClassName="companyCategoryPage__searchInput"
            icon={<FaSearch />}
            type="text"
            placeholder="Search name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </div>

        <div className="formLinks__tableWrapper">
          <CommonTable
            columns={columns}
            data={links}
            rowKey="_id"
            loading={loading && links.length === 0}
            loadingMessage="Loading form links..."
            error={listError}
            errorMessage="Failed to load form links."
            emptyMessage="No form links yet. Click Create Form Link."
            tableClassName="companyCategoryPage__table"
            thContentClassName="companyCategoryPage__thContent"
            sortIconClassName="companyCategoryPage__sortIcon"
          />
        </div>

        <CommonPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={total === 0 ? 0 : startIndex + 1}
          rangeEnd={endIndex}
          totalItems={total}
          showControls={total > rowsPerPage}
          onPageSelect={(page) => setCurrentPage(page)}
          onPrevious={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
          onNext={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === totalPages}
        />
      </div>
    </CommonListLayout>
  );
}