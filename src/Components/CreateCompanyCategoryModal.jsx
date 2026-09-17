import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import {
  createCompanyCategory,
  updateCompanyCategory,
  getAllCompanyCategories,
} from "../redux/companyCategory/companyCategoryThunk";
import { clearCompanyCategoryState } from "../redux/companyCategory/companyCategorySlice";
import "../assets/CSS/CreateCompanyCategoryModal.css";
import { showError, showSuccess } from "../utilits/toast";

const EMPTY_FORM = {
  name: "",
  description: "",
};

export default function CreateCompanyCategoryModal({
  onClose,
  isEditMode = false,
  editCategoryData = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const dispatch = useDispatch();

  const { loading, error } = useSelector((state) => state.companyCategory);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearCompanyCategoryState());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && editCategoryData) {
      setFormData({
        name: editCategoryData.name || "",
        description: editCategoryData.description || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }

    setFormErrors({});
  }, [isEditMode, editCategoryData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required.";
    }

    setFormErrors((prev) => ({
      ...prev,
      name: errors.name,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
    };

    try {
      if (isEditMode) {
        await dispatch(
          updateCompanyCategory({ id: editCategoryData._id, data: payload })
        ).unwrap();

        showSuccess("Company Category updated successfully");
      } else {
        await dispatch(createCompanyCategory(payload)).unwrap();

        showSuccess("Company Category created successfully");
      }

      // Refetch using the list's actual current page/limit/search/sort —
      // same reasoning as CreateContactModal.jsx's post-save refetch, so
      // the change is visible immediately without relying on some
      // unrelated state change to re-trigger CompanyCategory's own fetch
      // effect.
      dispatch(
        getAllCompanyCategories({
          page: currentPage,
          limit: rowsPerPage,
          search,
          sortBy,
          sortOrder,
        })
      );

      dispatch(clearCompanyCategoryState());

      onClose();
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        (typeof err === "string" ? err : "Something went wrong");

      // Field-specific backend errors are shown directly below their
      // related input instead of as a toast — matches
      // companycategory.service.js's assertNameNotDuplicate message
      // ("Category name already exists"). Any other error keeps the
      // existing toast behavior unchanged.
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("category name")
      ) {
        setFormErrors((prev) => ({ ...prev, name: message }));
        return;
      }

      showError(message);
    }
  };

  return (
    <div className="companyCategoryModalOverlay" onClick={onClose}>
      <div
        className="createCompanyCategoryModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <h2 className="modalTitle">
            {isEditMode ? "Edit Company Category" : "Create Company Category"}
          </h2>
          <button
            type="button"
            className="closeIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Suppressed when the same message is already shown below the
            Name field below, so a duplicate error (e.g. "Category name
            already exists") isn't shown twice. */}
        {error && error !== formErrors.name && (
          <p className="fieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="formGrid">
          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="fieldInput"
              placeholder="Category Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            {formErrors.name && <p className="fieldError">{formErrors.name}</p>}
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel">Description</label>
            <textarea
              className="fieldTextarea"
              placeholder="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
            {formErrors.description && (
              <p className="fieldError">{formErrors.description}</p>
            )}
          </div>
        </div>

        <div className="modalFooter">
          <button
            type="button"
            className="modalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="modalCreateButton"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : isEditMode ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}