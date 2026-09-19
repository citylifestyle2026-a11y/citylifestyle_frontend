import api from "../api/axios";

// ================= CREATE BOOKING =================
export const createBookingApi = async (data) => {
  const response = await api.post("/bookings/create", data);
  return response.data;
};

// ================= BULK IMPORT BOOKINGS (CSV) =================
// `file` is a browser File object (from an <input type="file"> — see
// BulkImportBookingModal). Sent as multipart/form-data under the "file"
// field name, matching the backend's csvUpload.single("file") on
// POST /bookings/import-csv. See api/axios.js's header comment for why
// Content-Type is intentionally left for axios to set automatically
// here (must NOT be hardcoded to application/json).
export const importBookingsCsvApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/bookings/import-csv", formData);
  return response.data;
};

// ================= GET ALL BOOKINGS =================
export const getAllBookingsApi = async (params) => {
  const response = await api.get("/bookings/get-all-bookings", {
    params,
  });

  return response.data;
};

// ================= GET BOOKING BY ID =================
export const getBookingByIdApi = async (id) => {
  const response = await api.get(`/bookings/${id}`);
  return response.data;
};

// ================= EXPORT BOOKINGS =================
export const exportBookings = async (params = {}) => {
  const response = await api.get("/bookings/export", {
    params,
    responseType: "blob",
  });

  return response;
};
// ================= DELETE BOOKING =================
export const deleteBookingApi = async (id, data) => {
  const response = await api.delete(`/bookings/delete/${id}`, {
    data,
  });

  return response.data;
};