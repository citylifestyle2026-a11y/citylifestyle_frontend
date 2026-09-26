import api from "../api/axios";

// ================= CREATE GUEST =================
export const createGuestApi = async (data) => {
  const response = await api.post("/guests/create", data);
  return response.data;
};

// ================= GET ALL GUESTS =================
// params supports: search, sortBy, sortOrder, page, limit, category,
// city, isVip — same query params guest.service.js (backend) reads.
export const getAllGuestsApi = async (params) => {
  const response = await api.get("/guests/get-all-guests", { params });
  return response.data;
};

// ================= GET GUEST BY ID =================
export const getGuestByIdApi = async (id) => {
  const response = await api.get(`/guests/${id}`);
  return response.data;
};

// ================= UPDATE GUEST =================
export const updateGuestApi = async (id, data) => {
  const response = await api.put(`/guests/${id}/update`, data);
  return response.data;
};

// ================= DELETE GUEST =================
export const deleteGuestApi = async (id) => {
  const response = await api.delete(`/guests/${id}/delete`);
  return response.data;
};
