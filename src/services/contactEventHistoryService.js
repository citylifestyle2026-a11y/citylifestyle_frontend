import api from "../api/axios";

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
