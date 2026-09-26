import api from "../api/axios";

// ================= CREATE COORDINATOR =================
export const createCoordinatorApi = async (data) => {
  const response = await api.post("/coordinators", data);
  return response.data;
};

// ================= GET ALL COORDINATORS =================
// params supports: search, page, limit — same query params
// coordinator.service.js (backend) reads.
export const getAllCoordinatorsApi = async (params) => {
  const response = await api.get("/coordinators", { params });
  return response.data;
};

// ================= GET COORDINATOR BY ID =================
export const getCoordinatorByIdApi = async (id) => {
  const response = await api.get(`/coordinators/${id}`);
  return response.data;
};

// ================= UPDATE COORDINATOR =================
export const updateCoordinatorApi = async (id, data) => {
  const response = await api.put(`/coordinators/${id}`, data);
  return response.data;
};

// ================= DELETE COORDINATOR =================
export const deleteCoordinatorApi = async (id) => {
  const response = await api.delete(`/coordinators/${id}`);
  return response.data;
};
