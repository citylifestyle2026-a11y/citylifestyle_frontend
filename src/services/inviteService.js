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

// Returns a PNG Blob of the card with the given name written on it.
export const previewInviteCardApi = async (name) =>
  (await api.get("/invite-guests/preview", { params: { name }, responseType: "blob" })).data;

export const createInviteGuestApi = async (data) =>
  (await api.post("/invite-guests", data)).data;

export const updateInviteGuestApi = async (id, data) =>
  (await api.put(`/invite-guests/${id}`, data)).data;
