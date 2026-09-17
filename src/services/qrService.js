import api from "../api/axios";

// ================= VERIFY QR =================
export const verifyQrApi = async (data, { signal } = {}) => {
  const response = await api.post("/qr/verify", data, { signal });
  return response.data;
};

// ================= CHECK-IN QR =================
export const checkInQrApi = async (data, { signal } = {}) => {
  const response = await api.post("/qr/check-in", data, { signal });
  return response.data;
};
