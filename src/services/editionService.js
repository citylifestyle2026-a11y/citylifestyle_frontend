import api from "../api/axios";

// ================= CREATE EDITION =================
export const createEditionApi = async (data) => {
  const response = await api.post("/editions/create", data);
  return response.data;
};

// ================= GET ALL EDITIONS =================
// params supports: search, sortBy, sortOrder, page, limit, status, year —
// same query params edition.service.js (backend) reads.
export const getAllEditionsApi = async (params) => {
  const response = await api.get("/editions/get-all-editions", { params });
  return response.data;
};

// ================= GET EDITION BY ID =================
export const getEditionByIdApi = async (id) => {
  const response = await api.get(`/editions/${id}`);
  return response.data;
};

// ================= UPDATE EDITION =================
export const updateEditionApi = async (id, data) => {
  const response = await api.put(`/editions/${id}/update`, data);
  return response.data;
};

// ================= DELETE EDITION =================
export const deleteEditionApi = async (id) => {
  const response = await api.delete(`/editions/${id}/delete`);
  return response.data;
};
