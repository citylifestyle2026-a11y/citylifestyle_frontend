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

// ================= FACE SCAN =================
// The server only SEARCHES on face-match; nothing is checked in until the
// staff confirm and face-check-in is called.
export const faceMatchApi = async (data, { signal } = {}) => {
  const response = await api.post("/qr/face-match", data, { signal });
  return response.data;
};

export const faceCheckInApi = async (data, { signal } = {}) => {
  const response = await api.post("/qr/face-check-in", data, { signal });
  return response.data;
};
