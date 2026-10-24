import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

import { createCrewApi, updateCrewApi } from "../services/crewService";
import { getAllCrewCategoriesApi, createCrewCategoryApi } from "../services/crewCategoryService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/CreateCrewCategoryModal.css";

const EMPTY_FORM = {
  fullName: "",
  whatsappNumber: "",
  email: "",
  crewCategory: "",
  designation: "",
  area: "",
  address: "",
  remark: "",
};

// Add a crew member (crew = null) or edit one.
export default function CreateCrewModal({ crew = null, onClose, onSaved }) {
  const isEditMode = Boolean(crew);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState(null); // null = hidden, string = adding
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setForm(
      crew
        ? {
            fullName: crew.fullName || "",
            whatsappNumber: crew.whatsappNumber || "",
            email: crew.email || "",
            crewCategory: crew.crewCategory?._id || "",
            designation: crew.designation || "",
            area: crew.area || "",
            address: crew.address || "",
            remark: crew.remark || "",
          }
        : EMPTY_FORM
    );
    setErrors({});
  }, [crew]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAllCrewCategoriesApi({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" });
        if (!cancelled) setCategories(res?.data || []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Creates a new Crew Category right here and selects it.
  const handleAddCategory = async () => {
    const name = (newCategoryName || "").trim();
    if (!name || addingCategory) return;

    setAddingCategory(true);
    try {
      const res = await createCrewCategoryApi({ name });
      const created = res?.data;
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setForm((prev) => ({ ...prev, crewCategory: created._id }));
      setErrors((prev) => ({ ...prev, crewCategory: undefined }));
      setNewCategoryName(null);
      showSuccess("Crew Category added");
    } catch (err) {
      showError(getErrorText(err, "Failed to add category"));
    } finally {
      setAddingCategory(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required.";
    if (!form.whatsappNumber.trim()) next.whatsappNumber = "WhatsApp number is required.";
    else if (!/^\+?[\d\s\-().]{10,16}$/.test(form.whatsappNumber.trim())) {
      next.whatsappNumber = "Enter a valid 10-digit WhatsApp number.";
    }
    if (!form.crewCategory) next.crewCategory = "Crew category is required.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (saving || !validate()) return;

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
    );

    setSaving(true);
    try {
      if (isEditMode) {
        await updateCrewApi(crew._id, payload);
        showSuccess("Crew member updated successfully");
      } else {
        await createCrewApi(payload);
        showSuccess("Crew member added successfully");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");
      if (/whatsapp|mobile/i.test(message)) setErrors((prev) => ({ ...prev, whatsappNumber: message }));
      else showError(message);
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <div className={`fieldGroup ${props.full ? "fieldGroupFull" : ""}`}>
      <label className="fieldLabel">
        {label} {props.required && <span className="required">*</span>}
      </label>
      {props.textarea ? (
        <textarea
          className="fieldTextarea"
          name={name}
          placeholder={label}
          value={form[name]}
          onChange={handleChange}
        />
      ) : (
        <input
          type="text"
          className="fieldInput"
          name={name}
          placeholder={props.placeholder || label}
          value={form[name]}
          onChange={handleChange}
        />
      )}
      {errors[name] && <p className="fieldError">{errors[name]}</p>}
    </div>
  );

  return (
    <div
      className="crewCategoryModalOverlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="createCrewCategoryModal"
        style={{ maxWidth: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <h2 className="modalTitle">{isEditMode ? "Edit Crew Member" : "Add Crew Member"}</h2>
          <button type="button" className="closeIconButton" onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        <div className="formGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {field("fullName", "Full Name", { required: true })}
          {field("whatsappNumber", "WhatsApp Number", { required: true, placeholder: "9876543210" })}


          <div className="fieldGroup">
            <label className="fieldLabel">Crew Category <span className="required">*</span></label>
            {newCategoryName === null ? (
              <>
                <select
                  className="fieldInput"
                  name="crewCategory"
                  value={form.crewCategory}
                  onChange={handleChange}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.crewCategory && <p className="fieldError">{errors.crewCategory}</p>}
                <button
                  type="button"
                  onClick={() => setNewCategoryName("")}
                  style={{ alignSelf: "flex-start", background: "none", border: 0, color: "#3b82c4", fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: 0 }}
                >
                  + Add new category
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="fieldInput"
                  autoFocus
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="modalCreateButton"
                    style={{ padding: "6px 14px", fontSize: 12.5 }}
                    onClick={handleAddCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                  >
                    {addingCategory ? "Adding..." : "Add"}
                  </button>
                  <button
                    type="button"
                    className="modalCloseButton"
                    style={{ padding: "6px 14px", fontSize: 12.5 }}
                    onClick={() => setNewCategoryName(null)}
                    disabled={addingCategory}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {field("designation", "Designation")}
          {field("email", "Email")}
          {field("area", "Area")}
          {field("address", "Address")}
          {field("remark", "Remark", { full: true, textarea: true })}
        </div>

        <div className="modalFooter">
          <button type="button" className="modalCloseButton" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="modalCreateButton" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isEditMode ? "Save" : "Add Crew"}
          </button>
        </div>
      </div>
    </div>
  );
}
