import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { newReferencesFrom } from "../utilits/references";
import { createContact, updateContact, getAllContacts, getUniqueReferences, getReferenceSummary } from "../redux/contact/contactThunk";
import { getContactPassApi, updateContactPassApi } from "../services/contactService";
import { clearContactState } from "../redux/contact/contactSlice";
import "../assets/CSS/CreateContactModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import ContactPhotoPicker from "./ContactPhotoPicker";
import { getInstagramUrl, instagramLinkError } from "../utilits/instagram";
import {
  getPublicCategoriesApi,
  submitPublicContactApi,
} from "../services/publicContactService";
import {
  isValidMobileNumber,
  toLocalMobileNumber,
} from "../utilits/mobileNumber";

// Same mobile rule as CreateUserModal.jsx/EditAdminModal.jsx's `mobile`
// field: 10 digits, with or without 91 / +91 in front (see
// utilits/mobileNumber.js). The number is always sent as 10 digits.
const isValidWhatsappNumber = (value) => isValidMobileNumber(value);

const EMPTY_FORM = {
  fullName: "",
  whatsappNumber: "",
  companyName: "",
  designation: "",
  address: "",
  area: "",
  instagramId: "",
  companyCategory: "",
  relationship: "",
  spouseName: "",
  spouseMobile: "",
  spouseInstagramId: "",
  profession: "",
  professionCategory: "",
};

// Same image rules as the User profile photo (CreateUserModal.jsx) and the
// backend's 100 MB image upload middleware.
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;

// Photo state: `file` = newly picked File (not uploaded yet), `preview` =
// what's shown in the circle (blob URL for a new file, or the saved URL
// when editing), `remove` = admin pressed Remove on a SAVED photo.
const EMPTY_PHOTO = { file: null, preview: "", remove: false };

export default function CreateContactModal({
  onClose,
  isEditMode = false,
  editContactData = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  companyCategoryFilter = "",
  referenceFilter = "",
  // Called after a successful save so the list can refetch itself.
  onSaved = null,
  // true = the PUBLIC page at /city-lifestyle: no login, shown as a normal
  // page (not a popup), saved through the public API, no admin lists refreshed.
  publicMode = false,
  // Public page opened from a "Share Form Link": { token, name, remaining }.
  // The link's name is the Reference (locked), and every submit takes one
  // place on the link.
  formLink = null,
  // Called after a successful link submission (refreshes the places left).
  onLinkSubmitted = null,
}) {
  const dispatch = useDispatch();

  const { loading: reduxLoading, error: reduxError } = useSelector((state) => state.contact);
  const { companyCategories } = useSelector((state) => state.companyCategory);

  // Edit mode only, for a contact whose pass was already sent: the guest
  // count of that pass can be changed here too.
  const [passInfo, setPassInfo] = useState(null); // { quantity, editable, maxGuests }
  const [passGuests, setPassGuests] = useState("");
  const [passResend, setPassResend] = useState(false);
  const [publicCategories, setPublicCategories] = useState([]);
  const [publicSaving, setPublicSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const loading = publicMode ? publicSaving : reduxLoading;
  const error = publicMode ? null : reduxError;
  // Category dropdown source: public API on the public page, redux in admin.
  const categories = publicMode ? publicCategories : companyCategories || [];

  useEffect(() => {
    if (!publicMode) return;
    getPublicCategoriesApi()
      .then((res) => setPublicCategories(res?.data || []))
      .catch(() => showError("Unable to load categories. Please refresh the page."));
  }, [publicMode]);

  const [formData, setFormData] = useState(EMPTY_FORM);

  // References are edited as a working list plus a separate "next value"
  // input — same separation as searchTerm/search elsewhere in the
  // project, just for a different purpose (staging one value before it's
  // committed to the list, instead of debouncing).
  const [references, setReferences] = useState(formLink ? [formLink.name] : []);
  const [referenceInput, setReferenceInput] = useState("");

  const [formErrors, setFormErrors] = useState({});

  const [profilePhoto, setProfilePhoto] = useState(EMPTY_PHOTO);
  const [spousePhoto, setSpousePhoto] = useState(EMPTY_PHOTO);

  // Blob URLs made for new previews must be released, or they leak memory
  // until the tab closes. The refs always hold the latest photo state so
  // the unmount cleanup below can see it.
  const profilePhotoRef = useRef(profilePhoto);
  const spousePhotoRef = useRef(spousePhoto);
  profilePhotoRef.current = profilePhoto;
  spousePhotoRef.current = spousePhoto;

  const releasePreview = (photo) => {
    if (photo?.file && photo.preview) URL.revokeObjectURL(photo.preview);
  };

  useEffect(() => {
    return () => {
      releasePreview(profilePhotoRef.current);
      releasePreview(spousePhotoRef.current);
    };
  }, []);

  useEffect(() => {
    if (publicMode) return undefined; // the public page scrolls normally

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [publicMode]);

  useEffect(() => {
    if (!publicMode) dispatch(clearContactState());
  }, [dispatch, publicMode]);

  useEffect(() => {
    if (!isEditMode || !editContactData?._id || !editContactData.passSentAt) {
      setPassInfo(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await getContactPassApi(editContactData._id);
        if (cancelled || !res?.data?.hasPass) return;
        setPassInfo(res.data);
        setPassGuests(String(res.data.quantity));
      } catch {
        if (!cancelled) setPassInfo(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, editContactData]);

  useEffect(() => {
    if (isEditMode && editContactData) {
      setFormData({
        fullName: editContactData.fullName || "",
        whatsappNumber: editContactData.whatsappNumber || "",
        companyName: editContactData.companyName || "",
        designation: editContactData.designation || "",
        address: editContactData.address || "",
        area: editContactData.area || "",
        // saved as a bare username; the form edits it as a profile LINK
        instagramId: getInstagramUrl(editContactData.instagramId),
        // companyCategory arrives populated as { _id, name } (see
        // contact.service.js's .populate("companyCategory", "name")) —
        // the <select> below needs the bare id.
        companyCategory: editContactData.companyCategory?._id || "",
        relationship: editContactData.relationship || "",
        spouseName: editContactData.spouseName || "",
        spouseMobile: editContactData.spouseMobile || "",
        spouseInstagramId: getInstagramUrl(editContactData.spouseInstagramId),
        profession: editContactData.profession || "",
        // populated as { _id, name } by contact.service.js
        professionCategory: editContactData.professionCategory?._id || "",
      });

      setReferences(
        Array.isArray(editContactData.references)
          ? editContactData.references
          : []
      );

      // Saved photos are shown as the preview; nothing new is picked yet.
      setProfilePhoto({
        file: null,
        preview: editContactData.profileImage || "",
        remove: false,
      });
      setSpousePhoto({
        file: null,
        preview: editContactData.spouseProfileImage || "",
        remove: false,
      });
    } else {
      setFormData(EMPTY_FORM);
      // A "Share Form Link" form always starts with the link's name as the
      // (locked) Reference.
      setReferences(formLink ? [formLink.name] : []);
      setProfilePhoto(EMPTY_PHOTO);
      setSpousePhoto(EMPTY_PHOTO);
    }

    setReferenceInput("");
    setFormErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editContactData]);

  // ---- Profile photo / Spouse photo ----
  // kind = "profile" | "spouse". A newly picked file replaces whatever was
  // there; Remove on a SAVED photo sets `remove` so the backend deletes it
  // (a photo that was only just picked, never saved, simply disappears).
  const pickPhoto = (kind, file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showError("Only PNG, JPG, JPEG and WEBP files are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      showError("Image size should be less than 100MB.");
      return;
    }

    const setter = kind === "spouse" ? setSpousePhoto : setProfilePhoto;
    const current = kind === "spouse" ? spousePhotoRef.current : profilePhotoRef.current;

    releasePreview(current);
    setter({ file, preview: URL.createObjectURL(file), remove: false });
    setFormErrors((prev) => ({
      ...prev,
      [kind === "spouse" ? "spousePhoto" : "profilePhoto"]: undefined,
    }));
  };

  const removePhoto = (kind) => {
    const setter = kind === "spouse" ? setSpousePhoto : setProfilePhoto;
    const current = kind === "spouse" ? spousePhotoRef.current : profilePhotoRef.current;
    const saved =
      kind === "spouse"
        ? editContactData?.spouseProfileImage
        : editContactData?.profileImage;

    releasePreview(current);
    setter({ file: null, preview: "", remove: Boolean(isEditMode && saved) });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Spouse Category (Couple only) ----
  // The spouse now only picks a Category (same list as the contact's own
  // Company Category). `profession` is no longer typed: it is filled with the
  // chosen category's name so lists/exports keep showing it. The category is
  // what makes a Couple contact also show under the spouse's category.
  const handleProfessionCategoryChange = (e) => {
    const category = categories.find((c) => c._id === e.target.value);

    setFormData((prev) => ({
      ...prev,
      profession: category ? category.name : "",
      professionCategory: category ? category._id : "",
    }));
    setFormErrors((prev) => ({ ...prev, professionCategory: undefined }));
  };

  // Relationship gets its own handler (instead of the generic
  // handleChange above) purely to add ONE extra behavior on top of it:
  // switching FROM "Couple" TO "Single" clears spouseName/spouseMobile/
  // profession — those fields are about to be hidden, and a value left
  // sitting in state for a hidden field would otherwise still get sent
  // on submit (see the payload in handleSubmit below). Their inline
  // errors are cleared at the same time so a stale "required" message
  // doesn't reappear if the admin flips back to Couple later without
  // having retyped anything yet.
  const handleRelationshipChange = (e) => {
    const { value } = e.target;

    setFormData((prev) => ({
      ...prev,
      relationship: value,
      ...(value !== "Couple"
        ? {
            spouseName: "",
            spouseMobile: "",
            spouseInstagramId: "",
            profession: "",
            professionCategory: "",
          }
        : {}),
    }));

    if (value !== "Couple") {
      // Spouse photo goes away with the rest of the spouse details (the
      // backend also deletes a saved spouse photo when relationship
      // becomes Single).
      releasePreview(spousePhotoRef.current);
      setSpousePhoto(EMPTY_PHOTO);

      setFormErrors((prev) => ({
        ...prev,
        spouseName: undefined,
        spouseMobile: undefined,
        spouseInstagramId: undefined,
        profession: undefined,
        professionCategory: undefined,
      }));
    }
  };

  // Adds the staged reference input to the working list. Trimmed and
  // de-duplicated CASE-INSENSITIVELY against the list already on screen —
  // the same rule the backend's own pre-save/pre-findOneAndUpdate hooks
  // enforce (see models/contact.model.js's normalizeReferences), applied
  // here too so the duplicate is rejected with an inline message instead
  // of silently vanishing after the backend normalizes it away.
  //
  // "Ramesh & Suresh" / "Ramesh/Suresh" / "Ramesh-Suresh" is added as TWO
  // references - the name before and after & / - are kept separate.
  const handleAddReference = () => {
    const trimmed = referenceInput.trim();

    if (!trimmed) return;

    const fresh = newReferencesFrom(trimmed, references);

    if (fresh.length === 0) {
      setFormErrors((prev) => ({
        ...prev,
        references: "This reference has already been added.",
      }));
      return;
    }

    setReferences((prev) => [...prev, ...fresh]);
    setReferenceInput("");
    setFormErrors((prev) => ({ ...prev, references: undefined }));
  };

  const handleReferenceKeyDown = (e) => {
    // Enter adds the reference instead of submitting the whole form —
    // matches the "Enter shouldn't submit" guard CommonSearch integrations
    // already use for the main search box elsewhere in the project.
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddReference();
    }
  };

  const handleRemoveReference = (index) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  // If the admin typed a reference but forgot to press "Add" before
  // submitting, don't silently lose it — but only when it's a single,
  // unambiguous value. A comma-separated group of names typed into the
  // same box and left un-added (e.g. "dev, karan") is NOT auto-split
  // and added, since that's guessing at intent; the admin must press
  // "Add" for each one individually, same as any other reference.
  const resolvePendingReferences = () => {
    const trimmed = referenceInput.trim();
    if (!trimmed) return references;

    const tokens = trimmed
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length !== 1) return references;

    // One typed value; "A & B" still becomes two references (A and B).
    const fresh = newReferencesFrom(tokens[0], references);

    if (fresh.length === 0) return references;

    return [...references, ...fresh];
  };

  // Every field is compulsory EXCEPT Address — mirrors the backend's
  // createContactValidation/updateContactValidation
  // (validators/contact.validator.js). `references` counts a
  // not-yet-"Add"ed value still sitting in the reference input box
  // (see resolvePendingReferences above), so the admin isn't blocked
  // just for not pressing "Add" before submitting.
  const validate = () => {
    const errors = {};

    // Edit mode: nothing is compulsory - only the format of values that are
    // filled in is checked. Create / public form keep every required rule.
    const req = !isEditMode;

    if (req && !formData.fullName.trim()) {
      errors.fullName = "Full Name is required.";
    }

    if (!formData.whatsappNumber.trim()) {
      if (req) errors.whatsappNumber = "WhatsApp Number is required.";
    } else if (!isValidWhatsappNumber(formData.whatsappNumber)) {
      errors.whatsappNumber =
        "Enter a valid 10-digit WhatsApp number (with or without 91).";
    }

    if (req && !formData.companyName.trim()) {
      errors.companyName = "Company Name is required.";
    }

    if (req && !formData.designation.trim()) {
      errors.designation = "Designation is required.";
    }

    if (req && !formData.companyCategory) {
      errors.companyCategory = "Company Category is required.";
    }

    if (req && !formData.area.trim()) {
      errors.area = "Area is required.";
    }

    // Instagram is OPTIONAL, but when filled it must be a profile LINK -
    // a plain name is rejected. Photos are optional too.
    const instagramError = instagramLinkError(formData.instagramId);
    if (instagramError) errors.instagramId = instagramError;

    // Relationship is required outright, independent of everything
    // below — mirrors validators/contact.validator.js's `relationship`
    // rule. No gender is inferred from this value anywhere in this
    // form.
    if (req && !formData.relationship) {
      errors.relationship = "Relationship is required.";
    }

    // Couple-only required fields — same conditional rule as the
    // backend's contact.validator.js (spouseName/spouseMobile/
    // profession are required for Couple, accepted blank for Single).
    // These fields are also hidden for Single (see the JSX below), so
    // in practice they can only be non-empty here if relationship is
    // currently Couple, or the admin just switched away from Couple —
    // handleRelationshipChange already clears them in that case.
    if (formData.relationship === "Couple") {
      if (req && !formData.spouseName.trim()) {
        errors.spouseName = "Spouse Name is required for Couple.";
      }

      if (!formData.spouseMobile.trim()) {
        if (req) errors.spouseMobile = "Spouse Mobile Number is required for Couple.";
      } else if (!isValidWhatsappNumber(formData.spouseMobile)) {
        errors.spouseMobile =
          "Enter a valid 10-digit Spouse Mobile Number (with or without 91).";
      }

      const spouseInstagramError = instagramLinkError(formData.spouseInstagramId);
      if (spouseInstagramError) errors.spouseInstagramId = spouseInstagramError;

      if (req && !formData.professionCategory) {
        errors.professionCategory = "Category is required for Couple.";
      }
    }

    if (req && resolvePendingReferences().length === 0) {
      errors.references = "At least one Reference is required.";
    }

    setFormErrors((prev) => ({
      ...prev,
      fullName: errors.fullName,
      whatsappNumber: errors.whatsappNumber,
      companyName: errors.companyName,
      designation: errors.designation,
      companyCategory: errors.companyCategory,
      area: errors.area,
      instagramId: errors.instagramId,
      spouseInstagramId: errors.spouseInstagramId,
      relationship: errors.relationship,
      spouseName: errors.spouseName,
      spouseMobile: errors.spouseMobile,
      professionCategory: errors.professionCategory,
      references: errors.references,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    const isCouple = formData.relationship === "Couple";

    // multipart/form-data (not JSON) because the two photos are files.
    // Every value is a string; `references` goes as a JSON string and is
    // turned back into an array by the backend (parseContactFormData).
    // Empty strings are still sent so clearing a field on Edit clears it
    // in the database too.
    const payload = new FormData();
    const fields = {
      fullName: formData.fullName.trim(),
      whatsappNumber: toLocalMobileNumber(formData.whatsappNumber),
      companyName: formData.companyName.trim(),
      designation: formData.designation.trim(),
      address: formData.address.trim(),
      area: formData.area.trim(),
      // Sent as the typed profile LINK; the backend stores the username.
      instagramId: formData.instagramId.trim(),
      references: JSON.stringify(resolvePendingReferences()),
      relationship: formData.relationship,
      // Blank for Single (handleRelationshipChange already clears these
      // when switching away from Couple, and they're hidden in the JSX
      // below), populated for Couple. spouseMobile is normalized with
      // the exact same toLocalMobileNumber used for whatsappNumber
      // above, so it's stored in the same 10-digit form.
      spouseName: formData.spouseName.trim(),
      spouseMobile: formData.spouseMobile.trim()
        ? toLocalMobileNumber(formData.spouseMobile)
        : "",
      spouseInstagramId: isCouple ? formData.spouseInstagramId.trim() : "",
      profession: formData.profession.trim(),
    };

    Object.entries(fields).forEach(([key, value]) => payload.append(key, value));

    if (publicMode) payload.append("website", honeypot); // honeypot (bots only)

    if (formData.companyCategory) {
      payload.append("companyCategory", formData.companyCategory);
    }
    if (isCouple && formData.professionCategory) {
      payload.append("professionCategory", formData.professionCategory);
    }

    if (profilePhoto.file) {
      payload.append("profileImage", profilePhoto.file);
    } else if (profilePhoto.remove) {
      payload.append("removeProfileImage", "true");
    }

    if (isCouple) {
      if (spousePhoto.file) {
        payload.append("spouseProfileImage", spousePhoto.file);
      } else if (spousePhoto.remove) {
        payload.append("removeSpouseProfileImage", "true");
      }
    }

    if (publicMode) {
      setPublicSaving(true);
      try {
        await submitPublicContactApi(payload, formLink?.token);
        setSubmitted(true);
        if (onLinkSubmitted) onLinkSubmitted();
      } catch (err) {
        showError(
          err?.response?.data?.message || "Something went wrong. Please try again."
        );
      } finally {
        setPublicSaving(false);
      }
      return;
    }

    try {
      if (isEditMode) {
        const res = await dispatch(
          updateContact({ id: editContactData._id, data: payload })
        ).unwrap();

        showSuccess(res?.message || "Contact updated successfully");

        // Pass guest count (only when it was changed). The contact itself
        // is already saved above, so a failure here is just reported.
        const newGuests = Number(passGuests);
        if (passInfo?.editable && newGuests && newGuests !== passInfo.quantity) {
          try {
            const passRes = await updateContactPassApi(editContactData._id, {
              quantity: newGuests,
              resendInvitation: passResend,
            });
            showSuccess(passRes?.message || "Pass updated");
          } catch (passErr) {
            showError(
              passErr?.response?.data?.message || "Contact saved, but the pass could not be updated."
            );
          }
        }
      } else {
        const res = await dispatch(createContact(payload)).unwrap();

        showSuccess(res?.message || "Contact created successfully");
      }

      // Refetch using the list's actual current page/limit/search/sort/
      // filters — same reasoning as CreateUserModal.jsx's post-save
      // refetch, so the change is visible immediately without relying on
      // some unrelated state change to re-trigger ContactList's own fetch
      // effect.
      const params = {
        page: currentPage,
        limit: rowsPerPage,
        search,
        sortBy,
        sortOrder,
      };

      if (companyCategoryFilter) params.companyCategory = companyCategoryFilter;
      if (referenceFilter) params.reference = referenceFilter;

      // The list (Guest List) refetches itself with every active filter
      // (status tab, edition, ...) when it passes onSaved; without it fall
      // back to the filters this modal knows about.
      if (typeof onSaved === "function") {
        onSaved();
      } else {
        dispatch(getAllContacts(params));
      }

      // A newly added reference (or the last contact holding a removed
      // one) can change which values are valid filter options — refresh
      // the dropdown's source so it never offers a stale/missing value.
      dispatch(getUniqueReferences({}));

      // Same reasoning for the grouped Reference Summary section below
      // the Contact List table — a new/edited contact's references (and
      // which contact names appear under each one) must stay in sync.
      dispatch(getReferenceSummary());

      dispatch(clearContactState());

      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");

      // Field-specific backend errors are shown directly below their
      // related input instead of as a toast — matches
      // contact.service.js's assertWhatsappNumberNotDuplicate message
      // ("WhatsApp Number already exists"). Any other error keeps the
      // existing toast behavior unchanged.
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("whatsapp")
      ) {
        setFormErrors((prev) => ({ ...prev, whatsappNumber: message }));
        return;
      }

      showError(message);
    }
  };

  // Public page: after a successful submit show a thank-you instead of the form.
  if (publicMode && submitted) {
    return (
      <div className="publicContactPage">
        <div className="createContactModal publicContactCard publicContactThanks">
          <div className="contactModalBadge" aria-hidden="true">&#9733;</div>
          <h2 className="contactModalTitle">Thank you!</h2>
          <p>Your details have been submitted successfully.</p>
          <button
            type="button"
            className="contactModalCreateButton"
            onClick={() => {
              setFormData(EMPTY_FORM);
              setReferences(formLink ? [formLink.name] : []);
              setReferenceInput("");
              setProfilePhoto(EMPTY_PHOTO);
              setSpousePhoto(EMPTY_PHOTO);
              setFormErrors({});
              setSubmitted(false);
            }}
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={publicMode ? "publicContactPage" : "contactModalOverlay"}
      onClick={publicMode ? undefined : onClose}
    >
      <div
        className={`createContactModal${publicMode ? " publicContactCard" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="contactModalHeader">
          {publicMode && (
            <div className="contactModalBadge" aria-hidden="true">&#9733;</div>
          )}
          <h2 className="contactModalTitle">
            {publicMode
              ? "पर्व — REQUEST YOUR INVITE"
              : isEditMode
                ? "Edit Contact"
                : "Create Contact"}
          </h2>
          {!publicMode && (
            <button
              type="button"
              className="contactCloseIconButton"
              onClick={onClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Honeypot: hidden from people, bots fill it. */}
        {publicMode && (
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", opacity: 0 }}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        )}

        {/* Suppressed when the same message is already shown below the
            WhatsApp Number field below, so a duplicate error (e.g.
            "WhatsApp Number already exists") isn't shown twice. */}
        {error && error !== formErrors.whatsappNumber && (
          <p className="contactFieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="contactFormGrid">
          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Full Name {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            {formErrors.fullName && <p className="contactFieldError">{formErrors.fullName}</p>}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              WhatsApp Number {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="WhatsApp Number (91 optional)"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
            />
            {formErrors.whatsappNumber && (
              <p className="contactFieldError">{formErrors.whatsappNumber}</p>
            )}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Company Name {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
            />
            {formErrors.companyName && (
              <p className="contactFieldError">{formErrors.companyName}</p>
            )}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Designation {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
            />
            {formErrors.designation && (
              <p className="contactFieldError">{formErrors.designation}</p>
            )}
          </div>

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">
              Company Category {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <select
              className="contactFieldSelect"
              name="companyCategory"
              value={formData.companyCategory}
              onChange={handleChange}
            >
              {isEditMode ? (
                <option value="">No category</option>
              ) : (
                <option value="" disabled>
                  Select Category
                </option>
              )}
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {formErrors.companyCategory && (
              <p className="contactFieldError">{formErrors.companyCategory}</p>
            )}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">Address</label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
            {formErrors.address && <p className="contactFieldError">{formErrors.address}</p>}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Area {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Area"
              name="area"
              value={formData.area}
              onChange={handleChange}
            />
            {formErrors.area && <p className="contactFieldError">{formErrors.area}</p>}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Instagram Link
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="https://instagram.com/username"
              name="instagramId"
              value={formData.instagramId}
              onChange={handleChange}
            />
            {formErrors.instagramId && (
              <p className="contactFieldError">{formErrors.instagramId}</p>
            )}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Profile Photo
            </label>
            <ContactPhotoPicker
              label="Profile photo"
              preview={profilePhoto.preview}
              onPick={(file) => pickPhoto("profile", file)}
              onRemove={() => removePhoto("profile")}
              disabled={loading}
            />
            {formErrors.profilePhoto && (
              <p className="contactFieldError">{formErrors.profilePhoto}</p>
            )}
          </div>

          {isEditMode && passInfo && (
            <div className="contactFieldGroup contactFieldGroupFull">
              <label className="contactFieldLabel">
                Pass Guests (Quantity)
              </label>
              <input
                type="number"
                className="contactFieldInput"
                min={1}
                max={passInfo.maxGuests || 10}
                step={1}
                value={passGuests}
                disabled={!passInfo.editable}
                onChange={(e) => setPassGuests(e.target.value)}
              />
              <p className="contactPassNote">
                {passInfo.editable
                  ? `Pass ${passInfo.bookingNumber} admits ${passInfo.quantity} guest${passInfo.quantity === 1 ? "" : "s"} now. Change it here (1 - ${passInfo.maxGuests || 10}).`
                  : "This older pass cannot change its guest count."}
              </p>
              {passInfo.editable && Number(passGuests) !== passInfo.quantity && (
                <label className="contactPassCheck">
                  <input
                    type="checkbox"
                    checked={passResend}
                    onChange={(e) => setPassResend(e.target.checked)}
                  />
                  Send the updated pass on WhatsApp after saving
                </label>
              )}
            </div>
          )}

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">
              Relationship {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            <select
              className="contactFieldSelect"
              name="relationship"
              value={formData.relationship}
              onChange={handleRelationshipChange}
            >
              <option value="">Select Relationship</option>
              <option value="Single">Single</option>
              <option value="Couple">Couple</option>
            </select>
            {formErrors.relationship && (
              <p className="contactFieldError">{formErrors.relationship}</p>
            )}
          </div>

          {/* Spouse Name / Spouse Mobile Number / Profession are only
              shown/collected for Couple — hidden entirely for Single,
              and their values are already cleared by
              handleRelationshipChange the moment Couple -> Single
              happens, so nothing hidden here is ever silently submitted. */}
          {formData.relationship === "Couple" && (
            <>
              <div className="contactFieldGroup">
                <label className="contactFieldLabel">
                  Spouse Name {!isEditMode && <span className="contactRequired">*</span>}
                </label>
                <input
                  type="text"
                  className="contactFieldInput"
                  placeholder="Spouse Name"
                  name="spouseName"
                  value={formData.spouseName}
                  onChange={handleChange}
                />
                {formErrors.spouseName && (
                  <p className="contactFieldError">{formErrors.spouseName}</p>
                )}
              </div>

              <div className="contactFieldGroup">
                <label className="contactFieldLabel">
                  Spouse Mobile Number {!isEditMode && <span className="contactRequired">*</span>}
                </label>
                <input
                  type="text"
                  className="contactFieldInput"
                  placeholder="Spouse Mobile Number (91 optional)"
                  name="spouseMobile"
                  value={formData.spouseMobile}
                  onChange={handleChange}
                />
                {formErrors.spouseMobile && (
                  <p className="contactFieldError">{formErrors.spouseMobile}</p>
                )}
              </div>

              <div className="contactFieldGroup">
                <label className="contactFieldLabel">
                  Spouse Instagram Link
                </label>
                <input
                  type="text"
                  className="contactFieldInput"
                  placeholder="https://instagram.com/username"
                  name="spouseInstagramId"
                  value={formData.spouseInstagramId}
                  onChange={handleChange}
                />
                {formErrors.spouseInstagramId && (
                  <p className="contactFieldError">{formErrors.spouseInstagramId}</p>
                )}
              </div>

              <div className="contactFieldGroup">
                <label className="contactFieldLabel">
                  Spouse Profile Photo
                </label>
                <ContactPhotoPicker
                  label="Spouse profile photo"
                  preview={spousePhoto.preview}
                  onPick={(file) => pickPhoto("spouse", file)}
                  onRemove={() => removePhoto("spouse")}
                  disabled={loading}
                />
                {formErrors.spousePhoto && (
                  <p className="contactFieldError">{formErrors.spousePhoto}</p>
                )}
              </div>

              <div className="contactFieldGroup contactFieldGroupFull">
                <label className="contactFieldLabel">
                  Category {!isEditMode && <span className="contactRequired">*</span>}
                </label>
                <select
                  className="contactFieldSelect"
                  aria-label="Spouse category"
                  value={formData.professionCategory || ""}
                  onChange={handleProfessionCategoryChange}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formErrors.professionCategory && (
                  <p className="contactFieldError">{formErrors.professionCategory}</p>
                )}
              </div>
            </>
          )}

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">
              Reference {!isEditMode && <span className="contactRequired">*</span>}
            </label>
            {!formLink && (
              <div className="referenceInputRow">
                <input
                  type="text"
                  className="contactFieldInput"
                  placeholder="Type a reference and press Add"
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  onKeyDown={handleReferenceKeyDown}
                />
                <button
                  type="button"
                  className="referenceAddButton"
                  onClick={handleAddReference}
                >
                  Add
                </button>
              </div>
            )}

            {references.length > 0 && (
              <div className="referenceChipList">
                {references.map((reference, index) => (
                  <span key={`${reference}-${index}`} className="referenceChip">
                    {reference}
                    {!formLink && (
                      <button
                        type="button"
                        className="referenceChipRemove"
                        onClick={() => handleRemoveReference(index)}
                        aria-label={`Remove reference ${reference}`}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {formErrors.references && (
              <p className="contactFieldError">{formErrors.references}</p>
            )}
          </div>
        </div>

        <div className="contactModalFooter">
          {!publicMode && (
            <button
              type="button"
              className="contactModalCloseButton"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="contactModalCreateButton"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : isEditMode ? "Save" : publicMode ? "Submit" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}