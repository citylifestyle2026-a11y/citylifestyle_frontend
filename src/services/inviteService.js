import api from "../api/axios";

export const listInviteGuestsApi = async (params) =>
  (await api.get("/invite-guests", { params })).data;

export const importInviteCsvApi = async (file, { dryRun = false } = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/invite-guests/import-csv", formData, {
    params: dryRun ? { dryRun: true } : undefined,
  });
  return res.data;
};

// body: { all: true } or { ids: [...] } (+ includeSent: true to re-send)
export const sendInviteCardsApi = async (body) =>
  (await api.post("/invite-guests/send", body)).data;

export const resetStuckInviteApi = async () =>
  (await api.post("/invite-guests/reset-stuck")).data;

export const deleteInviteGuestsApi = async (ids) =>
  (await api.post("/invite-guests/delete", { ids })).data;

// Returns a JPG Blob of the card with the given name written on it.
export const previewInviteCardApi = async (name) =>
  (await api.get("/invite-guests/preview", { params: { name }, responseType: "blob" })).data;

// ----- the card design (JPG / PNG uploaded by the admin) -----
export const getInviteDesignApi = async () => (await api.get("/invite-guests/design")).data;

export const uploadInviteDesignApi = async (file) => {
  const formData = new FormData();
  formData.append("design", file);
  return (await api.post("/invite-guests/design", formData)).data;
};

export const removeInviteDesignApi = async () => (await api.delete("/invite-guests/design")).data;

export const createInviteGuestApi = async (data) =>
  (await api.post("/invite-guests", data)).data;

export const updateInviteGuestApi = async (id, data) =>
  (await api.put(`/invite-guests/${id}`, data)).data;
