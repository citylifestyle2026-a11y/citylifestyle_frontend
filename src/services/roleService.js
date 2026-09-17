import api from "../api/axios";

// ================= GET ROLE =================
export const getRoleApi = async () => {
  const response = await api.get("/roles");
  return response.data;
};