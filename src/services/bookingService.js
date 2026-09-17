import api from "../api/axios";

// ================= CREATE BOOKING =================
export const createBookingApi = async (data) => {
  const response = await api.post("/bookings/create", data);
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