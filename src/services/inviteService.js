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
// `style` (optional) = { topPct, centerXPct, fontSizePct, color } lets the
// admin see a name position before saving it.
export const previewInviteCardApi = async (name, style = {}) =>
  (
    await api.get("/invite-guests/preview", {
      params: {
        name,
        top: style.topPct,
        x: style.centerXPct,
        size: style.fontSizePct,
        color: style.color,
      },
      responseType: "blob",
    })
  ).data;

// ----- the card design (JPG / PNG uploaded by the admin) -----
export const getInviteDesignApi = async () => (await api.get("/invite-guests/design")).data;

export const uploadInviteDesignApi = async (file) => {
  const formData = new FormData();
  formData.append("design", file);
  return (await api.post("/invite-guests/design", formData)).data;
};

export const saveInviteNameStyleApi = async (style) =>
  (await api.put("/invite-guests/design/style", style)).data;

export const removeInviteDesignApi = async () => (await api.delete("/invite-guests/design")).data;

export const createInviteGuestApi = async (data) =>
  (await api.post("/invite-guests", data)).data;

export const updateInviteGuestApi = async (id, data) =>
  (await api.put(`/invite-guests/${id}`, data)).data;