import api from "../api/axios";

// Create Event
export const createEventApi = (data) => {
  return api.post("/events/create", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// View Event
export const getEventByIdApi = (id) => {
  return api.get(`/events/${id}`);
};
// get all event
// Get All Events
export const getAllEventsApi = async (params) => {
  const response = await api.get("/events/get-all-events", {
    params,
  });

  return response.data;
};
// Update Event
// Same response shape as createEventApi (raw axios response) since the
// thunk needs response.data the same way createEvent's thunk does.
export const updateEventApi = (id, data) => {
  return api.put(`/events/${id}/update`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Delete Event
// Secure Manual Event Delete (Step 3 backend): the currently authenticated
// admin's own email + password must be sent in the request body for the
// backend to verify before it deletes anything.
// Same response shape as changeEventStatusApi (already-unwrapped .data)
// since there's no form data to re-populate from the result.
export const deleteEventApi = async (id, credentials) => {
  const response = await api.delete(`/events/${id}/delete`, {
    data: credentials, // { email, password }
  });
  return response.data;
};

// Change Event Status
export const changeEventStatusApi = async (id) => {
  const response = await api.patch(`/events/${id}/status`);
  return response.data;
};