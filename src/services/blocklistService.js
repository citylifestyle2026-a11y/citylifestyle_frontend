import api from "../api/axios";

// ================= BLOCK LIST =================
export const getBlocklistApi = async (params) => {
  const response = await api.get("/blocklist", { params });
  return response.data;
};

export const createBlockApi = async (data) => {
  const response = await api.post("/blocklist", data);
  return response.data;
};

export const updateBlockApi = async (id, data) => {
  const response = await api.put(`/blocklist/${id}`, data);
  return response.data;
};

export const removeBlockApi = async (id) => {
  const response = await api.delete(`/blocklist/${id}`);
  return response.data;
};
