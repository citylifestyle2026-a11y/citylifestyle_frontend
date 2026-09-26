import api from "../api/axios";

// ================= CREATE NOMINATION =================
export const createNominationApi = async (data) => {
  const response = await api.post("/nominations/create", data);
  return response.data;
};

// ================= GET ALL NOMINATIONS =================
// params supports: editionId, status, coordinatorId, sortBy, sortOrder,
// page, limit — same query params nomination.service.js (backend)
// reads. A Coordinator's own nominations are scoped server-side, so no
// extra param is needed here to get "my nominations" vs "all".
export const getAllNominationsApi = async (params) => {
  const response = await api.get("/nominations/get-all-nominations", { params });
  return response.data;
};

// ================= GET NOMINATION BY ID =================
export const getNominationByIdApi = async (id) => {
  const response = await api.get(`/nominations/${id}`);
  return response.data;
};
