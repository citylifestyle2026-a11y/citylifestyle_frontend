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

// `number` (optional): a same-name guest with ANOTHER number - only that number
// is unblocked; the blocked number stays blocked.
export const removeBlockApi = async (id, number = "") => {
  const response = await api.delete(`/blocklist/${id}`, {
    params: number ? { number } : {},
  });
  return response.data;
};
