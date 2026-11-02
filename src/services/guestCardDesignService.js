import api from "../api/axios";

// ADMIN: the design of the public guest card (guests add their own photo + name).
// Separate from the Invitation Cards design.
const BASE = "/invite-guests/guest-design";

export const getGuestDesignApi = async () => (await api.get(BASE)).data;

export const uploadGuestDesignApi = async (file) => {
  const formData = new FormData();
  formData.append("design", file);
  return (await api.post(BASE, formData)).data;
};

export const saveGuestNameStyleApi = async (style) => (await api.put(`${BASE}/style`, style)).data;

export const saveGuestPhotoBoxApi = async (box) => (await api.put(`${BASE}/photo-box`, box)).data;

export const removeGuestDesignApi = async () => (await api.delete(BASE)).data;

// The blank card picture as a Blob (needs the admin login, so it cannot be a plain <img src>).
export const getGuestDesignImageApi = async () =>
  (await api.get(`${BASE}/image`, { responseType: "blob" })).data;