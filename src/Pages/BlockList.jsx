import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaBan, FaChevronDown } from "react-icons/fa";

import CommonListLayout from "../Components/CommonListLayout";
import CommonPageHeader from "../Components/CommonPageHeader";
import CommonSearch from "../Components/CommonSearch";
import CommonSelect from "../Components/CommonSelect";
import CommonTable from "../Components/CommonTable";
import CommonPagination from "../Components/CommonPagination";
import BlockPersonModal from "../Components/BlockPersonModal";

import { getBlocklistApi, removeBlockApi } from "../services/blocklistService";
import { formatDate } from "../utilits/dateFormat";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { confirmDialog } from "../utilits/appSwal";
import useClickOutside from "../hooks/useClickOutside";
import useActionMenuRoom from "../hooks/useActionMenuRoom";

// Reuses the Company Category page styling so this page looks like the rest
// of the admin; BlockList.css only adds the block-specific bits.
import "../assets/CSS/CompanyCategory.css";
import "../assets/CSS/BlockList.css";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }));

export default function BlockList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [modal, setModal] = useState(null); // null | { person? }

  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(currentPage * rowsPerPage, total);

  // Debounced search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBlocklistApi({ page: currentPage, limit: rowsPerPage, search })
      .then((res) => {
        if (cancelled) return;
        setItems(res?.data || []);
        setTotal(res?.pagination?.total || 0);
        setTotalPages(res?.pagination?.totalPages || 1);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorText(err, "Failed to load Ghost List."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [currentPage, rowsPerPage, search, reloadKey]);

  const actionMenuRef = useRef(null);
  // Gives the open Action menu room inside the scrolling table wrapper, so
  // Edit / Unblock are never cut off (even when there is only one row).
  const tableWrapperRef = useRef(null);
  useActionMenuRoom(tableWrapperRef, openActionMenuId, ".companyCategoryAction__menuOpen");
  useClickOutside(actionMenuRef, () => setOpenActionMenuId(null));

  const handleToggleActionMenu = useCallback((id) => {
    setOpenActionMenuId((prev) => (prev === id ? null : id));
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleUnblock = useCallback(
    async (row) => {
      setOpenActionMenuId(null);
      const ok = await confirmDialog({
        title: `Unblock ${row.name}?`,
        text: "This person will no longer be flagged anywhere.",
        confirmText: "Yes, unblock",
        tone: "danger",
      });
      if (!ok) return;
      try {
        const res = await removeBlockApi(row._id);
        showSuccess(res?.message || "Person unblocked");
        // Step back a page if that was the last row of the page.
        if (items.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
        else reload();
      } catch (err) {
        showError(getErrorText(err, "Could not unblock."));
      }
    },
    [items.length, currentPage, reload]
  );

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: false, hideSortIcon: true, render: (r) => r.name },
      {
        key: "mobile",
        label: "Mobile",
        sortable: false,
        hideSortIcon: true,
        cellClassName: "blockListPage__mobile",
        render: (r) => String(r.mobileNumber || "").replace(/^91(?=\d{10}$)/, ""),
      },
      {
        key: "reason",
        label: "Reason",
        sortable: false,
        hideSortIcon: true,
        cellClassName: "blockListPage__reason",
        render: (r) => r.reason,
      },
      {
        key: "blockedBy",
        label: "Blocked By",
        sortable: false,
        hideSortIcon: true,
        render: (r) => r.blockedByName || "-",
      },
      {
        key: "createdAt",
        label: "Blocked On",
        sortable: false,
        hideSortIcon: true,
        render: (r) => formatDate(r.createdAt),
      },
      {
        key: "action",
        label: "Actions",
        sortable: false,
        headerClassName: "appActionCol",
        cellClassName: "appActionCol",
        cellStyle: { position: "relative" },
        render: (row) => (
          <div
            className="companyCategoryAction__wrapper"
            ref={openActionMenuId === row._id ? actionMenuRef : null}
          >
            <button
              type="button"
              className="companyCategoryAction__button"
              onClick={() => handleToggleActionMenu(row._id)}
            >
              Action
              <FaChevronDown className="companyCategoryAction__icon" />
            </button>

            <div
              className={`companyCategoryAction__menu ${
                openActionMenuId === row._id ? "companyCategoryAction__menuOpen" : ""
              }`}
            >
              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setModal({ person: row });
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="companyCategoryAction__item"
                onClick={() => handleUnblock(row)}
              >
                Unblock
              </button>
            </div>
          </div>
        ),
      },
    ],
    [openActionMenuId, handleToggleActionMenu, handleUnblock]
  );

  return (
    <CommonListLayout
      pageClassName="companyCategoryPage__page"
      mainAreaClassName="companyCategoryPage__mainArea"
      contentClassName="companyCategoryPage__content"
      headerTitle="Ghost List"
      outsideMainArea={
        modal && (
          <BlockPersonModal
            person={modal.person || null}
            prefill={modal.prefill || null}
            onClose={() => setModal(null)}
            onSaved={() => {
              setCurrentPage(1);
              reload();
            }}
          />
        )
      }
    >
      <CommonPageHeader
        containerClassName="companyCategoryPage__topRow"
        title="Ghost List"
        titleClassName="companyCategoryPage__pageTitle"
        titleStyle={{ textAlign: "start", display: "block" }}
        breadcrumb={
          <div className="companyCategoryPage__breadcrumb">
            <Link to="/dashboard" className="appBreadcrumbLink">Dashboard</Link>
            <span>-</span>
            <span className="companyCategoryPage__breadcrumbActive">Ghost List</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="companyCategoryPage__createButton"
            onClick={() => setModal({})}
          >
            <FaBan />
            Block Person
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
            placeholder="Search name, mobile or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </div>

        <div className="companyCategoryPage__tableWrapper companyCategoryPage__tableWrapper--ghost" ref={tableWrapperRef}>
          <CommonTable
            columns={columns}
            data={items}
            rowKey="_id"
            loading={loading && items.length === 0}
            loadingMessage="Loading Ghost List..."
            error={error}
            errorMessage="Failed to load Ghost List."
            emptyMessage={search ? `No blocked person found for "${search}".` : "No one is blocked yet."}
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
          onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          prevDisabled={currentPage === 1}
          nextDisabled={currentPage === totalPages}
        />
      </div>
    </CommonListLayout>
  );
}