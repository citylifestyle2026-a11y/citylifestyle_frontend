import api from "../api/axios";

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
  });

  return response.data;
};

// ================= EXPORT CONTACTS =================
// params supports: search, sortBy, sortOrder, companyCategory,
// reference — same filter/sort params as getAllContactsApi (minus
// page/limit, since every matching contact is exported). Must stay in
// sync with the backend's GET /contacts/export route.
export const exportContactsApi = async (params) => {
  const response = await api.get("/contacts/export", {
    params,
    responseType: "blob",
  });

  return response;
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