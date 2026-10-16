import api from "../api/axios";

// ================= LIST =================
// params: { page, limit, search, profession, moved, sortBy, sortOrder }
export const getAllMembersApi = async (params) => {
  const response = await api.get("/members", { params });
  return response.data;
};

export const getMemberProfessionsApi = async () => {
  const response = await api.get("/members/professions");
  return response.data;
};

// ================= IMPORT (.xlsx / .csv) =================
// dryRun = true only checks the file (nothing is saved).
export const importMembersApi = async (file, { dryRun = false } = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/members/import", formData, {
    params: dryRun ? { dryRun: true } : undefined,
  });
  return response.data;
};

// ================= MOVE TO GUEST LIST =================
// body: { ids: string[] } or { selectAll: true, filters: {...} }, + eventId
export const moveMembersToGuestListApi = async (data) => {
  const response = await api.post("/members/move-to-guest-list", data);
  return response.data;
};

// ================= DELETE (HARD) =================
export const deleteMemberApi = async (id) => {
  const response = await api.delete(`/members/${id}`);
  return response.data;
};
