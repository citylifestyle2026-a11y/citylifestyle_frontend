import api from "../api/axios";

// ================= GET ALL EVENT HISTORY (ALL CONTACTS) =================
// params supports: contactId, editionId, status, page, limit — powers
// the standalone Sidebar "Event History" page.
export const getAllEventHistoryApi = async (params) => {
  const response = await api.get("/contact-event-history/get-all-event-history", {
    params,
  });

  return response.data;
};

// ================= CREATE EVENT HISTORY =================
export const createEventHistoryApi = async (data) => {
  const response = await api.post("/contact-event-history/create", data);
  return response.data;
};

// ================= GET EVENT HISTORY BY CONTACT =================
// params supports: page, limit (optional — omit both to fetch the full
// timeline, same as contactEventHistory.service.js (backend) reads).
export const getEventHistoryByContactApi = async (contactId, params) => {
  const response = await api.get(`/contact-event-history/contact/${contactId}`, {
    params,
  });

  return response.data;
};

// ================= UPDATE EVENT HISTORY =================
export const updateEventHistoryApi = async (id, data) => {
  const response = await api.put(`/contact-event-history/${id}/update`, data);
  return response.data;
};

// ================= DELETE EVENT HISTORY =================
export const deleteEventHistoryApi = async (id) => {
  const response = await api.delete(`/contact-event-history/${id}/delete`);
  return response.data;
};

// ================= ENTRY REPORT -> ADD TO EVENT HISTORY =================
// Counts for the confirmation popup (registered / entered / not entered).
export const getEventHistorySyncSummaryApi = async (eventId) => {
  const response = await api.get("/contact-event-history/sync-summary", {
    params: { eventId },
  });

  return response.data;
};

// data: { eventId, ticketIds?: [...], selectAll?: boolean }
export const syncEventHistoryFromEventApi = async (data) => {
  const response = await api.post("/contact-event-history/sync-from-event", data);
  return response.data;
};
