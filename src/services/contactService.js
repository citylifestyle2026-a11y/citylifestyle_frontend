import api from "../api/axios";
import { normalizeBlobError } from "../utilits/apiError";

// ================= CREATE CONTACT =================
export const createContactApi = async (data) => {
  const response = await api.post("/contacts/create", data);
  return response.data;
};

// ================= GET ALL CONTACTS =================
// params supports: search, sortBy, sortOrder, page, limit,
// companyCategory, reference — same query params
// contactService.getAllContacts (backend) reads.
export const getAllContactsApi = async (params) => {
  const response = await api.get("/contacts/get-all-contacts", {
    params,
    // reference: ["a","b"] -> reference=a&reference=b
    paramsSerializer: { indexes: null },
  });

  return response.data;
};

// ================= EXPORT CONTACTS =================
// params supports: search, sortBy, sortOrder, companyCategory,
// reference — same filter/sort params as getAllContactsApi (minus
// page/limit, since every matching contact is exported). Must stay in
// sync with the backend's GET /contacts/export route.
export const exportContactsApi = async (params) => {
  try {
    const response = await api.get("/contacts/export", {
      params,
      paramsSerializer: { indexes: null },
      responseType: "blob",
    });

    return response;
  } catch (error) {
    // With responseType "blob" the server's JSON error arrives as a Blob —
    // unwrap it so the real message reaches the thunk (same approach as
    // entryReportService.js).
    throw await normalizeBlobError(error);
  }
};

// ================= GET CONTACT BY ID =================
export const getContactByIdApi = async (id) => {
  const response = await api.get(`/contacts/${id}`);
  return response.data;
};

// ================= UPDATE CONTACT =================
export const updateContactApi = async (id, data) => {
  const response = await api.put(`/contacts/${id}/update`, data);
  return response.data;
};

// ================= DELETE CONTACT =================
export const deleteContactApi = async (id) => {
  const response = await api.delete(`/contacts/${id}/delete`);
  return response.data;
};

// ================= GET UNIQUE REFERENCES =================
// params supports: search (optional). Must stay in sync with the
// backend's GET /contacts/unique-references route.
export const getUniqueReferencesApi = async (params) => {
  const response = await api.get("/contacts/unique-references", {
    params,
  });

  return response.data;
};

// ================= GET REFERENCE SUMMARY (GROUPED) =================
// Powers the "Reference Summary" section shown below the Contact List
// table — every unique reference (case-insensitive, trimmed) grouped
// with the full list of contact names that hold it. Must stay in sync
// with the backend's GET /contacts/reference-summary route (see
// services/contact.service.js's getReferenceSummary on the backend).
// The endpoint returns the full grouped list in one response — no
// search/pagination params, since the backend route doesn't support any.
export const getReferenceSummaryApi = async () => {
  const response = await api.get("/contacts/reference-summary");
  return response.data;
};

// ================= BULK APPROVAL STATUS =================
// body: { ids: string[], status: "pending" | "approved" | "rejected" }
// Used for a single row action and for checkbox multi-select alike.
export const bulkUpdateContactStatusApi = async (data) => {
  const response = await api.put("/contacts/bulk-status", data);
  return response.data;
};

// ================= SEND PASS (WHATSAPP) =================
// body: { ids: string[], eventId, ticketTypeId }
export const sendContactPassApi = async (data) => {
  const response = await api.post("/contacts/send-pass", data);
  return response.data;
};

// ================= DELETE BOOKING (PASS) =================
// body: { ids: string[] }
export const deleteContactBookingApi = async (data) => {
  const response = await api.post("/contacts/delete-booking", data);
  return response.data;
};

// ================= PASS GUEST COUNT (EDIT CONTACT) =================
// GET -> { data: { hasPass, quantity, editable, maxGuests, bookingNumber } }
export const getContactPassApi = async (id) => {
  const response = await api.get(`/contacts/${id}/pass`);
  return response.data;
};

// body: { quantity, resendInvitation }
export const updateContactPassApi = async (id, data) => {
  const response = await api.put(`/contacts/${id}/pass`, data);
  return response.data;
};

// ================= RESEND PASS (WHATSAPP) =================
// body: { ids: string[] } - sends the SAME pass again to contacts that
// already have an active pass.
export const resendContactPassApi = async (data) => {
  const response = await api.post("/contacts/resend-pass", data);
  return response.data;
};

// ================= IMPORT CONTACTS (CSV) =================
// file: browser File. options.dryRun = true only checks the file (nothing
// is saved); options.approvalStatus = "approved" | "pending" for real imports.
// Content-Type is left for axios to set (multipart boundary).
export const importContactsCsvApi = async (
  file,
  { dryRun = false, approvalStatus = "approved" } = {}
) => {
  const formData = new FormData();
  formData.append("approvalStatus", approvalStatus);
  formData.append("file", file);

  const response = await api.post("/contacts/import-csv", formData, {
    params: dryRun ? { dryRun: true } : undefined,
  });
  return response.data;
};

// ================= CANCEL PASS (APPROVED GUEST) =================
// body: { ids: string[] } - cancels the pass (QR stops working), moves the
// guest to Rejected and sends the "your pass has been cancelled" message.
export const cancelContactPassApi = async (data) => {
  const response = await api.post("/contacts/cancel-pass", data);
  return response.data;
};

// ================= MERGE & SYNC WITH CONTACT BOOK =================
// Both versions of every field of a Guest List row and the Contact Book member
// that has the same WhatsApp number (GET /contacts/:id/merge-preview).
export const getMergePreviewApi = async (id) => {
  const response = await api.get(`/contacts/${id}/merge-preview`);
  return response.data;
};

// Merges and syncs both rows (POST /contacts/:id/merge-member).
// choices: { [fieldKey]: "contact" | "member" } for the fields that differ.
export const mergeContactWithMemberApi = async (id, choices = {}) => {
  const response = await api.post(`/contacts/${id}/merge-member`, { choices });
  return response.data;
};

// ================= DUPLICATE TAB (FORM SUBMISSIONS WITH A KNOWN NUMBER) =================
// Public-form submissions whose WhatsApp number is already in the Guest List.
// params: { page, limit, search }
export const getDuplicatesApi = async (params = {}) => {
  const response = await api.get("/contacts/duplicates", { params });
  return response.data;
};

// Existing guest vs new submission, field by field.
export const getDuplicatePreviewApi = async (id) => {
  const response = await api.get(`/contacts/duplicates/${id}/preview`);
  return response.data;
};

// Writes the chosen values into the Guest List row (+ Contact Book row).
// choices: { [fieldKey]: "existing" | "new" } for the fields that differ.
export const fixDuplicateApi = async (id, choices = {}) => {
  const response = await api.post(`/contacts/duplicates/${id}/fix`, { choices });
  return response.data;
};

// Throws the submission away.
export const ignoreDuplicateApi = async (id) => {
  const response = await api.delete(`/contacts/duplicates/${id}`);
  return response.data;
};
